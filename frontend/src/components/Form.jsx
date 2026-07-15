import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/Form.css";
import LoadingIndicator from "./LoadingIndicator";

function Form({ route, method }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const isLogin = method === "login";
  const title = isLogin ? "登入" : "註冊";
  const buttonText = isLogin ? "登入並開始製作" : "建立帳號";

  const getErrorMessage = (requestError) => {
    const data = requestError.response?.data;
    if (data?.detail) return data.detail;
    if (data?.username) return Array.isArray(data.username) ? data.username[0] : data.username;
    if (data?.password) return Array.isArray(data.password) ? data.password[0] : data.password;
    return isLogin ? "登入失敗，請確認帳號與密碼。" : "註冊失敗，請稍後再試。";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post(route, { username: username.trim(), password });

      if (isLogin) {
        localStorage.setItem(ACCESS_TOKEN, response.data.access);
        localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
        navigate("/new-task");
      } else {
        navigate("/");
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-copy">
          <p className="auth-kicker">Video Maker</p>
          <h1 id="auth-title">{title}</h1>
          <p>
            {isLogin
              ? "登入後開始製作影片旁白與素材片段。"
              : "建立帳號，開始整理你的影片製作流程。"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="username">帳號</label>
          <input
            id="username"
            className="form-input"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="請輸入帳號"
            autoComplete="username"
            required
          />

          <label htmlFor="password">密碼</label>
          <input
            id="password"
            className="form-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="請輸入密碼"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
          />

          {error && <p className="form-error">{error}</p>}
          {loading && <LoadingIndicator />}

          <button className="form-button" type="submit" disabled={loading}>
            {loading ? "處理中..." : buttonText}
          </button>

          <p className="auth-switch">
            {isLogin ? "還沒有帳號？" : "已經有帳號？"}
            <Link to={isLogin ? "/register" : "/"}>{isLogin ? "前往註冊" : "回到登入"}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Form;
