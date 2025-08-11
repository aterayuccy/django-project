import {useState} from 'react'
import api from "../api"
import {useNavigate} from "react-router-dom"
import { ACCESS_TOKEN,REFRESH_TOKEN } from '../constants'
import "../styles/Form.css"
import LoadingIndicator from './LoadingIndicator'


function Form({route,method}) {
    const [username,setUserName] = useState("")
    const [password,setPassword] = useState("")
    const [loading,setLoading] = useState(false)
    const navigate = useNavigate()

    const name= method ==="login" ? "登入" : "註冊"

    const handleSubmit=async(e)=>{
        setLoading(true)
        e.preventDefault()  
        
        try{
            const res= await api.post(route,{username,password})
            if (method === "login"){
                localStorage.setItem(ACCESS_TOKEN,res.data.access)
                localStorage.setItem(REFRESH_TOKEN,res.data.refresh)
                navigate("/")
            } else{
                navigate("/login")
            }
        }
        catch(error){
            alert(error)
        }finally{
            setLoading(false)
        }
    }

    return <form onSubmit={handleSubmit} className="form-container">
        <h1>{name}</h1>
        <input 
        className="form-input"
        type="text" 
        value={username} 
        onChange={(e)=>setUserName(e.target.value)}
        placeholder="使用者名稱"
        />
        <input 
        className="form-input"
        type="password" 
        value={password} 
        onChange={(e)=>setPassword(e.target.value)}
        placeholder="密碼"
        />
        {loading && <LoadingIndicator /> }
       <button className="form-button" type="submit">{name}</button>
        
        </form>
}

export default Form