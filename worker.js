// このサイトは https://nirin-navi.com/cost に移転した。旧URLはすべて恒久リダイレクトする
// (共有リンクの入力値を引き継ぐためクエリ文字列も残す)。
const NEW_ORIGIN = "https://nirin-navi.com";
const PAGES = new Set(["50cc", "125cc", "250cc", "400cc", "oogata"]);

export default {
  fetch(request) {
    const url = new URL(request.url);
    const seg = url.pathname.replace(/^\/+|\/+$/g, "");
    let path = "/cost";
    if (PAGES.has(seg)) path = `/cost/${seg}`;
    else if (seg === "privacy") path = "/privacy";
    return Response.redirect(NEW_ORIGIN + path + url.search, 301);
  },
};
