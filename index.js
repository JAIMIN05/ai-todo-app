import { db } from './db/index.js';
import { todosTable } from './db/schema.js';
import { ilike, eq, ne } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import readlineSync from 'readline-sync';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

//Tools

async function getAllTodos() {
    const todos = await db.select().from(todosTable);
    return todos;
}

async function createTodo(todo) {
    const [result] = await db.insert(todosTable).values({
        todo,
    })
    .returning({
        id: todosTable.id,
    });
    return result.id; 
}

async function deleteTodo(id) {
    await db.delete(todosTable).where(eq(todosTable.id, id));
}

async function searchTodo(search) {
    const todos = await db.select().from(todosTable).where(ilike(todosTable.todo, `%{search}%`));
    return todos;
}

const tools = {
    getAllTodos: getAllTodos,
    createTodo: createTodo,
    deleteTodo: deleteTodo,
    searchTodo: searchTodo   
};

const SYSTEM_PROMPT = `
You are an AI To-Do List Assistant that helps users manage their tasks intelligently. You should:
1. Understand natural language requests
2. Extract the actual task from conversational inputs
3. Format tasks clearly and professionally

IMPORTANT: You must ALWAYS respond in the following JSON format, one JSON object per line:
{ "type": "plan", "plan": "your plan here" }
{ "type": "action", "function": "toolName", "input": "tool input here" }
{ "type": "observation", "observation": "result here" }
{ "type": "output", "output": "your final response here" }

Never respond with markdown, plain text, or any other format.

Todo DB Schema:
id: Int and Primary Key
todo: String
created_at: Date Time
updated_at: Date Time

Available Tools:
- getAllTodos(): Return all the Todos from Database
- createTodo(todo: string): Create a new Todo in the DataBase and returns the ID of created todo
- deleteTodo(id: string): Delete the todo by ID given in the DataBase
- searchTodo(query: string): Searches for all todos matching the query string using iLike in DataBase

Example 1:
START
{ "type": "user", "user": "what are my todos?" }
{ "type": "plan", "plan": "I will retrieve all todos from the database" }
{ "type": "action", "function": "getAllTodos", "input": "" }
{ "type": "observation", "observation": "[{id: 1, todo: 'Example task'}]" }
{ "type": "output", "output": "Here are all your todos:\\n1. Example task" }

Example 2:
START
{ "type": "user", "user": "I need to buy groceries and make dinner tonight" }
{ "type": "plan", "plan": "I will create a todo for the combined tasks" }
{ "type": "action", "function": "createTodo", "input": "Buy groceries and prepare dinner" }
{ "type": "observation", "observation": "3" }
{ "type": "output", "output": "Added the task to your todo list. Don't forget to buy groceries and make dinner!" }
`
const messages = [{
    role: 'model',
    content: SYSTEM_PROMPT
}];

while (true) {
    const query = readlineSync.question('>> ');
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const chat = await model.startChat();
        
        // Always send the system prompt with each new message to reinforce the format
        await chat.sendMessage(SYSTEM_PROMPT);
        const result = await chat.sendMessage(query);
        const responseText = await result.response.text();
        
        // Add debug logging
        console.log('\nAI Response:', responseText);
        
        try {
            const lines = responseText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('START'));
            
            for (const line of lines) {
                try {
                    const call = JSON.parse(line.trim());
                    
                    if (!call.type) {
                        console.error('Invalid response format - missing type:', line);
                        continue;
                    }

                    if (call.type === 'action') {
                        const fn = tools[call.function];
                        if (!fn) {
                            console.error(`Unknown function: ${call.function}`);
                            continue;
                        }
                        const observation = await fn(call.input);
                        
                        // Send the observation back to the AI
                        const obs = { "type": "observation", "observation": observation };
                        console.log('Tool observation:', JSON.stringify(obs));
                        
                        // Get AI's response to the observation
                        const followUpResult = await chat.sendMessage(JSON.stringify(obs));
                        const followUpResponse = await followUpResult.response.text();
                        console.log('AI Follow-up:', followUpResponse);
                        
                        // Process the follow-up response
                        const followUpLines = followUpResponse
                            .split('\n')
                            .map(l => l.trim())
                            .filter(l => l && !l.startsWith('START'));
                            
                        for (const followUpLine of followUpLines) {
                            try {
                                const followUpCall = JSON.parse(followUpLine);
                                if (followUpCall.type === 'output') {
                                    console.log(`🤖: ${followUpCall.output}`);
                                }
                            } catch (e) {
                                console.error("Error parsing follow-up line:", followUpLine);
                            }
                        }
                    } else if (call.type === 'output') {
                        console.log(`🤖: ${call.output}`);
                    }
                } catch (lineParseError) {
                    console.error("Invalid JSON format:", line);
                    continue;
                }
            }
        } catch (parseError) {
            console.error("Error processing response:", parseError);
        }
    } catch (error) {
        console.error("Error:", error);
        break;
    }
}