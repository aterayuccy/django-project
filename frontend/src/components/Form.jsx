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
  const [displayName, setDisplayName] = useState("");
  const [loginName, setLoginName] = useState("");
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
        ? { login_name: loginName.trim(), password }
        : {
            display_name: displayName.trim(),
            login_name: loginName.trim(),
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
        setDisplayName("");
        setLoginName("");
        setPassword("");
        setPasswordConfirm("");
      }
    } catch (requestError) {
      setError(
        getFirstError(requestError.response?.data) ||
          (isLogin
            ? "登入失敗，請確認登入帳號與密碼。"
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
              ? "使用登入帳號與密碼，繼續製作和管理你的影片。"
              : "使用者名稱可以重複；登入帳號則是你登入時使用的唯一名稱。"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <label htmlFor="display-name">使用者名稱</label>
              <input
                id="display-name"
                className="form-input"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="顯示在頭像下方的名稱"
                autoComplete="nickname"
                maxLength={50}
                required
              />
              <p className="form-hint">可以和其他使用者重複。</p>
            </>
          )}

          <label htmlFor="login-name">登入帳號</label>
          <input
            id="login-name"
            className="form-input"
            type="text"
            value={loginName}
            onChange={(event) => setLoginName(event.target.value)}
            placeholder="例如 video_user01"
            autoComplete="username"
            minLength={4}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
            required
          />
          {!isLogin && (
            <p className="form-hint">
              需為 4–30 位英文字母、數字或底線，且不可與別人重複。
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
