import argparse
import uvicorn
import os
import shutil
import sys
from dotenv import load_dotenv

if sys.version_info >= (3, 9):
    from importlib import resources
else:
    import importlib_resources as resources

def initialize_workspace():
    """Initialize the current directory with default skills and data if missing."""
    if not os.path.exists("skills"):
        print("Initializing default skills...")
        try:
            # Use the newer importlib.resources API if available
            if hasattr(resources, 'files'):
                package_skills = resources.files('legal_draft_agent').joinpath('skills')
                if package_skills.exists():
                    # shutil.copytree doesn't work directly with Pathlib-like objects from resources in some cases
                    # so we convert to a string path if possible or iterate
                    os.makedirs("skills", exist_ok=True)
                    for skill_dir in package_skills.iterdir():
                        if skill_dir.is_dir():
                            shutil.copytree(str(skill_dir), os.path.join("skills", skill_dir.name), dirs_exist_ok=True)
            else:
                # Fallback for older versions
                with resources.path('legal_draft_agent', 'skills') as package_skills:
                    if os.path.exists(package_skills):
                        shutil.copytree(str(package_skills), "skills", dirs_exist_ok=True)
        except Exception as e:
            print(f"Warning: Could not initialize skills from package: {e}")
            os.makedirs("skills", exist_ok=True)
    
    if not os.path.exists("data/raw"):
        os.makedirs("data/raw", exist_ok=True)
    
    if not os.path.exists("memory"):
        os.makedirs("memory", exist_ok=True)

def start():
    parser = argparse.ArgumentParser(description="Legal Draft Agent CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Start command
    start_parser = subparsers.add_parser("start", help="Start the FastAPI server")
    start_parser.add_argument("--host", default="0.0.0.0", help="Host to bind the server to")
    start_parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    start_parser.add_argument("--env-file", default=".env", help="Path to the .env file")
    start_parser.add_argument("--provider", help="Override the LLM provider (e.g. openrouter, openai)")
    start_parser.add_argument("--llm", help="Override the LLM model to use")
    start_parser.add_argument("--api-key", help="Override the API key")
    start_parser.add_argument("--db-path", help="Override the database path")
    start_parser.add_argument("--no-init", action="store_true", help="Do not initialize default directories")

    args = parser.parse_args()

    if args.command == "start":
        if not args.no_init:
            initialize_workspace()

        # 1. Load from .env file (lowest priority)
        if os.path.exists(args.env_file):
            print(f"Loading environment from {args.env_file}")
            load_dotenv(args.env_file)
        
        # 2. CLI arguments (highest priority) - inject into os.environ
        if args.provider:
            os.environ["PROVIDER"] = args.provider
        if args.llm:
            os.environ["LLM"] = args.llm
        if args.api_key:
            os.environ["API_KEY"] = args.api_key
        if args.db_path:
            os.environ["DB_PATH"] = args.db_path
        
        # Verify required env vars (os.getenv will now pick up either terminal env, .env, or CLI args)
        required_vars = ["API_KEY", "LLM"]
        missing = [v for v in required_vars if not os.getenv(v)]
        if missing:
            print(f"Error: Missing required environment variables: {', '.join(missing)}")
            print("Please set them in your environment, provide an --env-file, or use --llm and --api-key flags.")
            return

        print(f"Starting Legal Draft Agent API on {args.host}:{args.port}")
        print(f"Using Provider: {os.getenv('PROVIDER', 'openrouter')}")
        print(f"Using LLM: {os.getenv('LLM')}")
        uvicorn.run("legal_draft_agent.main:app", host=args.host, port=args.port, reload=False)
    else:
        parser.print_help()

if __name__ == "__main__":
    start()
