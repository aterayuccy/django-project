import {useState,useEffect} from 'react';
import api from '../api';
import Note from '../components/Note';
import '../styles/Home.css';

function Home() {
    const [notes,setNotes] = useState([]);
    const [content,setContent] = useState("");
    const [title,setTitle] = useState("");

    useEffect(()=>{
        getNotes();
    },[])

    const getNotes = () => {
        api
        .get('/api/notes/')
        .then((res)=>res.data)
        .then((data)=>{setNotes(data);console.log(data)})
        .catch((err)=>alert(err));
    }

    const deleteNote = (id) => {
        api.delete(`/api/notes/delete/${id}/`).then((res)=>{
            if (res.status ===204) alert("任務刪除成功")
            else alert("任務新增失敗")
            getNotes();
        }).catch((error)=>alert(error))
    }

    const createNote = (e) => {
        e.preventDefault()
        api.post('/api/notes/',{ content,title})
        .then((res)=>{
            if (res.status === 201) alert("任務新增成功")
            else alert("任務新增失敗")
            getNotes();
        })
        .catch((err)=>alert(err))        
    }
    return <div>
        <div>
            <h2>任務清單</h2>
            {notes.map((note)=><Note note={note} onDelete={deleteNote} key={note.id}/>)
            }
        </div>
        <h2>新增任務</h2>
        <form onSubmit={createNote}>
            <label htmlFor ="title" >標題</label>
            <br />
            <input 
            type="text" 
            id="title" 
            name="title"
            onChange={(e)=>setTitle(e.target.value)}
            value={title}
            />
            <label htmlFor ="content" >內容</label>
            <br />
            <textarea 
            id='content' 
            name='content' 
            required value={content}
            onChange={(e)=>setContent(e.target.value)}
            ></textarea>
            <br />
            <input type='submit' value='新增'></input>
        </form>
    </div>;
}

export default Home;