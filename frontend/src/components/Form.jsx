import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/Form.css";
import LoadingIndicator from "./LoadingIndicator";

function Form({ route, method }) {
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const isLogin = method === "login";
  const title = isLogin ? "登入" : "註冊";
  const buttonText = isLogin ? "登入帳號" : "建立帳號";

  const getErrorMessage = (error) => {
    if (error.response?.data?.detail) return error.response.data.detail;
    if (error.response?.data?.username) return error.response.data.username[0];
    if (error.response?.data?.password) return error.response.data.password[0];
    return isLogin ? "登入失敗，請確認帳號或密碼。" : "註冊失敗，請稍後再試。";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post(route, { username, password });

      if (isLogin) {
        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
        navigate("/new-task");
      } else {
        navigate("/");
      }
    } catch (error) {
      setError(getErrorMessage(error));
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
          <p>{isLogin ? "登入後開始製作影片旁白與素材片段。" : "建立帳號，開始整理你的影片製作流程。"}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="username">帳號</label>
          <input
            id="username"
            className="form-input"
            type="text"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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
            <Link to={isLogin ? "/register" : "/"}>{isLogin ? "前往註冊" : "前往登入"}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Form;
