import {tavily} from '@tavily/core'
import express from "express"
import { OpenRouter } from "@openrouter/sdk";
import fs from "fs";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from './prompt';
import { prisma } from './db';
import { middleware } from './middleware';
import cors from "cors"



declare module "express-serve-static-core"{
    interface Request{
        userId? : string
    }
}

function slugify(text: string) {
    const base = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "chat";

    return `${base}-${crypto.randomUUID().slice(0, 8)}`;

}

function sourcesBlock(results: { url: string }[]) {

  return `\n<SOURCES>\n${JSON.stringify(results.map((r) => ({ url: r.url })))}\n</SOURCES>\n`;

}
const openrouter = new OpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY
});
const client = tavily({ apiKey: process.env.TAVILY_API_KEY});
const app = express()

app.use(express.json())

app.use(cors({ exposedHeaders: ["X-Conversation-Id"] }))




// get Past Conversations
app.get("/conversations",middleware,async(req,res)=>{
    try {
        const conversations = await prisma.conversation.findMany({
           where:{
            userId:req.userId
           }
        })
        return res.json({conversations})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"Failed to fetch conversations"})
    }
})

// get past conversation 
app.get("/conversation/:conversationId",middleware,async (req,res)=>{
    try {
        const conversationId = req.params.conversationId
        if(typeof conversationId !== "string" || typeof conversationId === undefined){
            res.status(400).json({message:"Invalid conversation id"})
            return 
        }
        const conversation =  await prisma.conversation.findFirst({
            where:{
                id:conversationId,
                userId:req.userId
            },
            include:{
                messages:{orderBy :{createdAt:"asc"}}
            }
        })

        if(!conversation){
            res.status(404).json({message:"conversation not found"})
            return
        }
        return res.json({conversation})
    } catch (error) {
        res.json(error)
    }
})

app.post("/perplexity_ask",middleware,async (req,res)=>{
    // Step 1 :get the query from the user
    const query = req.body.query;

    // Step 2 :make sure user has access/credits to hit the endpoint

    // Step 3 :check if we have web search indexed for a similar query (TODO )
    
    // Step 4 :web search to gather sources
   
    const webSearchResponse = await client.search(query, {
        searchDepth: "advanced"
    })

    const webSearchResults = webSearchResponse.results
    // Step 5 :do some context engineering on the prompt + websearch responses
    
    // create conversation upfront

    const conversation = await prisma.conversation.create({
        data :{
            title: query.slice(0,80),
            slug:slugify(query),
            userId:req.userId!,
            messages:{
                create : {content:query,role:"User"}
            },
        }
    })

    res.setHeader("X-Conversation-Id", conversation.id)

    // Step 6 :hit the llm and stream back the response
    const user_prompt = PROMPT_TEMPLATE
                        .replace("{{WEB_SEARCH_RESULTS}}",JSON.stringify(webSearchResults))
                        .replace("{{USER_QUERY}}",JSON.stringify(query))

    const stream = await openrouter.chat.send({
        chatRequest: {
            model: "openai/gpt-5-chat",
            messages:[
                    {
                        role:"system",
                        content: SYSTEM_PROMPT
                    },
                    { 
                    role: "user",
                    content: user_prompt,

                    },
            ],
            stream: true,
            },

        });
    let assistantText = ""
    for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
            assistantText+=content
            res.write(content)
        }
    }
    const sources = sourcesBlock(webSearchResults)
    res.write(sources)
    // Step 7 :also stream back the sources and followup questions (which we can get from another parallel LLM call)
    // webSearchResults.forEach(result=>res.write(JSON.stringify({"url":result.url})))
    // res.write("\n</SOURCES>\n")
    //Step 8 : close the stream
    res.end()

    await prisma.message.create({
        data:{
            content: assistantText + sources,
            role: "Assistant",
            conversationId:conversation.id
        }
    })
})

app.post("/coversation/follow-up",middleware,async(req,res)=>{
    

    const query = req.body.query
    const conversationId = req.body.conversationId
    // Step 1 : get the existing chat from the db
    const conversation = await prisma.conversation.findFirst({
        where:{
            id:conversationId,
            userId:req.userId
        },
        include : { messages : { orderBy : {createdAt:"asc"}}}
    })
    if(!conversation ){
        return res.status(404).json({message:"conversation doesnot exist"})
    }

    // fresh websearch
    const webSearchResponse = await client.search(query, {
        searchDepth: "advanced"
    })

    const webSearchResults = webSearchResponse.results

    await prisma.message.create({
        data:{
            content:query,
            role:"User",
            conversationId:conversation.id,
        }
    })
    // Step 2 : Forward the full history to the LLM
    // TODO : Do Context Engineering here

    const history  = conversation.messages.map(m=>({
        role:m.role === "User" ? "user" : "assistant",
        content:m.content
    }))
    const user_prompt = PROMPT_TEMPLATE
                        .replace("{{WEB_SEARCH_RESULTS}}",JSON.stringify(webSearchResults))
                        .replace("{{USER_QUERY}}",JSON.stringify(query))
    // Step 3 : Stream the response to the user.
    const stream = await openrouter.chat.send({
        chatRequest: {
            model: "openai/gpt-5-chat",
            messages:[
                    {
                        role:"system",
                        content: SYSTEM_PROMPT
                    },
                    { 
                    role: "user",
                    content: user_prompt,

                    },
            ],
            stream: true,
            },

    });

    res.header('Cache-Control', 'no-cache');
    res.header('Content-Type', 'text/event-stream');
    res.header('X-Conversation-Id', conversation.id);

    let assistantText = ""
    for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
            assistantText+=content
            res.write(content)
        }
    }
    const sources = sourcesBlock(webSearchResults)
    res.write(sources)

    await prisma.message.create({
        data:{
            content: assistantText + sources,
            role: "Assistant",
            conversationId:conversation.id
        }
    })
})
app.listen(3001)