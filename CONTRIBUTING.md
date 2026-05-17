# Contributing to Legal Draft Skill

Thank you for your interest in contributing to Legal Draft Skill! This document provides guidelines for contributing to the project and instructions for building the distribution packages.

## Code of Conduct

Please be respectful and professional in all interactions related to this project.

## How to Contribute

### 1. Reporting Bugs
- Use the GitHub issue tracker to report bugs.
- Include a clear description of the issue and steps to reproduce it.

### 2. Suggesting Enhancements
- Open an issue to discuss your ideas before starting work.

### 3. Pull Requests
- Fork the repository and create a new branch for your changes.
- Ensure your code follows the existing style and is well-tested.
- Submit a pull request with a detailed description of your changes.

## Development Setup

1.  **Clone the repository.**
2.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -e ".[test]"
    pip install build twine
    ```
4.  **Install UI dependencies:**
    ```bash
    cd ui && npm install
    ```

## Building the PyPI Package

The project uses a `Makefile` to automate the bundling and packaging process.

### Step 1: Bundle the UI
The UI must be built as a static export and embedded into the Python package source:
```bash
make bundle
```

### Step 2: Build the Python Package
Generate the source distribution and wheel:
```bash
make dist
```
This will create a `dist/` directory containing the `.tar.gz` and `.whl` files.

### Step 3: Verify the Build Locally
Follow the instructions in `README.md` under **Local Package Verification** to test the generated wheel in a clean environment.

### Step 4: Publish to PyPI
To upload the package to PyPI (requires maintainer credentials):
```bash
python3 -m twine upload dist/*
```

## Testing

Always run tests before submitting a pull request:
```bash
make test
```

## Technology Stack

- **Backend:** Python 3.10+, FastAPI, LangChain, SQLite-vec.
- **Frontend:** Next.js (React), Tailwind CSS, Lucide icons.
- **Packaging:** Setuptools, Docker, Makefile.
