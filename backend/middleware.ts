import type { NextFunction, Request, Response } from "express";
import { createSupaBaseClient } from "./client";
import { prisma } from "./db";

const client = createSupaBaseClient()

export async function middleware(req: Request,res: Response,next: NextFunction){
    const token = req.headers.authorization
    
    const data = await client.auth.getUser(token)
    const userId = data.data.user?.id
    // console.log(JSON.stringify(data.data.user?.user_metadata))
    if(userId){
        try {
            await prisma.user.create({
                
                data :{
                    id:data.data.user?.id!,
                    email:data.data.user?.email!, 
                    provider:data.data.user?.app_metadata.provider  === "google" ? "Google" : "Github", 
                    name:data.data.user?.user_metadata.full_name,
                    supabaseId:data.data.user?.id!
                }
            
            }
        )
        } catch (error) {
            console.log(error)
        }
    }
    if(data.data.user){
        req.userId = data.data.user.id
        next()
    }else{
        res.status(403).json({
            message: "Unauthorized"
        })
    }

}