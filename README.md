# AI-Powered Todo List CLI

An intelligent command-line todo list application powered by Google's Gemini AI. The application understands natural language commands and manages todos using a PostgreSQL database.

## Features

- Natural language processing for todo management
- PostgreSQL database integration using Drizzle ORM
- Docker containerization for easy development
- Google Gemini AI integration for intelligent task interpretation

## Tech Stack

- Node.js
- PostgreSQL
- Drizzle ORM
- Google Gemini AI
- Docker & Docker Compose

## Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- Google Gemini API key

## Project Structure
├── db/
│ ├── index.js # Database connection configuration
│ └── schema.js # Database schema definition
├── drizzle/
│ ├── meta/ # Drizzle migration metadata
│ └── .sql # SQL migration files
├── docker-compose.yaml # Docker configuration
├── index.js # Main application file
└── .env # Environment variables

## bash
 - >> add buy groceries
 - 🤖: Added "buy groceries" to your todo list!
 - >> show all todos
 - 🤖: Here are your todos:
 - buy groceries
