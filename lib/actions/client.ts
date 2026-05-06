import { appEnv } from "@/constants/app-env";

type DataProps = {
  token?: string | undefined;
  formData?: unknown;
  method?: "POST" | "DELETE" | "GET" | "HEAD" | "PATCH";
};

export default async function client(url: string, data: DataProps) {
  const { formData } = data;
  const method = data.method ?? (formData ? "POST" : "GET");

  let requestUrl = `${appEnv.APP_URL}/${url}`;
  const headers: Record<string, string> = { accept: "application/json" };

  const init: RequestInit = { method, headers };

  if (method === "GET" || method === "HEAD") {
    if (formData != null && typeof formData === "object") {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(formData)) {
        if (value !== undefined && value !== null) {
          qs.set(key, String(value));
        }
      }
      const q = qs.toString();
      if (q) {
        requestUrl += requestUrl.includes("?") ? `&${q}` : `?${q}`;
      }
    }
  } else {
    headers["Content-Type"] = "application/json";
    if (formData !== undefined) {
      init.body = JSON.stringify(formData);
    }
  }

  const res = await fetch(requestUrl, init);
  return res.json();
}
