# Matrix

A web application library of JavaScript functions for solving [ARC-2](https://www.arcprize.org/) challenges.

## Overview

Matrix is a project designed to build and maintain a curated library of reusable JavaScript/TypeScript functions that can be leveraged to solve ARC-2 (Abstraction and Reasoning Corpus 2) challenges. The application provides a centralized hub for discovering, sharing, and organizing algorithmic solutions to complex pattern recognition and reasoning tasks.

## Features

- **Function Library**: A comprehensive collection of TypeScript functions tailored for ARC-2 problem-solving.
- **Web Interface**: User-friendly web application for refactoring Python solutions into modular JavaScript.
- **Reusable Components**: Modular, well-documented functions designed for composition and reuse.
- **Challenge Solutions**: Solutions organized by problem type and difficulty level.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
git clone https://github.com/sanmquin/Matrix.git
cd Matrix
npm install
```

### Running the Application

```bash
npm run dev
```

## Project Structure

```
Matrix/
├── src/              # Source code for the web application (React/TS)
├── netlify/functions # Backend serverless functions (Gemini/GitHub integration)
├── library/          # Extracted modular TypeScript functions
├── solutions/        # Refactored JavaScript solutions
├── tests/            # Test suite (Playwright)
└── README.md         # This file
```

## Usage

1. Enter an ARC Task ID.
2. Review the original Python solution.
3. Use the LLM-powered refactor tool to convert it to modular JavaScript.
4. Verify the solution against the training and test data.
5. Publish to the GitHub repository to create a Pull Request with the solution and modular library functions.

## ARC-2 Challenges

The ARC-2 benchmark focuses on testing abstract reasoning and problem-solving abilities. This library provides functions to help tackle various types of challenges, including:

- Pattern recognition
- Transformation logic
- Grid-based reasoning
- Symbolic manipulation

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-new-function`)
3. Commit your changes (`git commit -am 'Add new function'`)
4. Push to the branch (`git push origin feature/my-new-function`)
5. Open a Pull Request

## License

MIT

## Resources

- [ARC Prize Official Site](https://www.arcprize.org/)
- [ARC-2 Challenge Details](https://www.arcprize.org/)

## Contact

For questions or suggestions, please open an issue or contact [@sanmquin](https://github.com/sanmquin).

---

**Status**: Active development phase
