import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom";
import axios from "axios"
import { BACKEND_URL } from "@/lib/config";

const supabase = createClient()

export default function Dashboard(){

    const navigate = useNavigate()

    const [user,setUser] = useState<any>();

    useEffect(()=>{
        async function isuserLogin(){
            const { data: { user } } = await supabase.auth.getUser()
            if(user){
                console.log(user)
                setUser(user)
            }
            
        }
        isuserLogin()
    },[])
    
    useEffect(()=>{
        async function getconversation(){
            if(user){
                const {data:{session}} = await supabase.auth.getSession()
                const jwt = session?.access_token
                const response = await axios.get(`${BACKEND_URL}/conversations`,{
                    headers:{
                        Authorization:jwt
                    }
                })
                console.log("response",response.data)
            }
            
        }
        getconversation()
    },[user])
    
    return(
        <>
        {!user && <button onClick={()=>{
            navigate("/auth")
        }}>sign in</button>}
        
        {user && <div>
            <p>{user?.email}</p>
            <button onClick={()=>{
                supabase.auth.signOut()
                setUser(null)
            }}>Logout</button>
            </div>}
        </>
    )
}