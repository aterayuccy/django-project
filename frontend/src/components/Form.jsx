import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/Form.css";
import LoadingIndicator from "./LoadingIndicator";

const getFirstError = (data) => {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return getFirstError(data[0]);

  for (const value of Object.values(data)) {
    const message = getFirstError(value);
    if (message) return message;
  }

  return "";
};

function Form({ route, method }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const isLogin = method === "login";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = isLogin
        ? { username: username.trim(), password }
        : {
            username: username.trim(),
            password,
            password_confirm: passwordConfirm,
          };
      const response = await api.post(route, payload);

      if (isLogin) {
        localStorage.setItem(ACCESS_TOKEN, response.data.access);
        localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
        navigate("/new-task");
      } else {
        setSuccess(response.data.detail);
        setUsername("");
        setPassword("");
        setPasswordConfirm("");
      }
    } catch (requestError) {
      setError(
        getFirstError(requestError.response?.data) ||
          (isLogin
            ? "登入失敗，請確認使用者名稱與密碼。"
            : "註冊失敗，請稍後再試。"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-copy">
          <p className="auth-kicker">Video Maker</p>
          <h1 id="auth-title">{isLogin ? "登入" : "建立帳號"}</h1>
          <p>
            {isLogin
              ? "使用使用者名稱與密碼，繼續製作和管理你的影片。"
              : "使用者名稱將用來登入，也會顯示在頭像下方，不能與其他人重複。"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="username">使用者名稱</label>
          <input
            id="username"
            className="form-input"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="例如 小明 或 video_user01"
            autoComplete="username"
            minLength={2}
            maxLength={30}
            required
          />
          {!isLogin && (
            <p className="form-hint">
              需為 2–30 位，可使用中文、英文、數字及 @、.、+、-、_，且不可與別人重複。
            </p>
          )}

          <label htmlFor="password">密碼</label>
          <input
            id="password"
            className="form-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isLogin ? "輸入密碼" : "至少 8 位，包含英文字母與數字"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 8}
            maxLength={64}
            required
          />

          {!isLogin && (
            <>
              <p className="form-hint">
                密碼需為 8–64 位，至少包含一個英文字母與一個數字，也可以使用符號。
              </p>
              <label htmlFor="password-confirm">再次輸入密碼</label>
              <input
                id="password-confirm"
                className="form-input"
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="再次輸入相同密碼"
                autoComplete="new-password"
                minLength={8}
                maxLength={64}
                required
              />
            </>
          )}

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
          {loading && <LoadingIndicator />}

          <button className="form-button" type="submit" disabled={loading}>
            {loading ? "處理中…" : isLogin ? "登入" : "建立帳號"}
          </button>

          <p className="auth-switch">
            {isLogin ? "還沒有帳號？" : "已經有帳號？"}
            <Link to={isLogin ? "/register" : "/"}>
              {isLogin ? "前往註冊" : "回到登入"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Form;
