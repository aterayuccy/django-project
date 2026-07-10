import '../styles/Note.css';

function Note({ note, onDelete }) {
  const formattedDate = new Date(note.created_at).toLocaleDateString('zh-TW');

  return (
    <article className="note-container">
      <p className="note-label">影片旁白內容</p>
      <p className="note-title">{note.title}</p>
      <p className="note-content">{note.content}</p>
      <p className="note-date">{formattedDate}</p>
      <button className="delete-button" onClick={() => onDelete(note.id)}>
        刪除
      </button>
    </article>
  );
}

export default Note;
