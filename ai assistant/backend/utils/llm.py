import json
import requests
import httpx
from openai import OpenAI
from backend.config import MODEL_PROVIDER, MODEL_NAME, OPENAI_API_KEY, OLLAMA_HOST

def check_and_pull_ollama_model(model_name: str) -> bool:
    """Checks if the Ollama model is available locally, and attempts to pull it if not."""
    try:
        url_tags = f"{OLLAMA_HOST}/api/tags"
        try:
            res = requests.get(url_tags, timeout=3)
            if res.status_code != 200:
                return False
        except Exception:
            # Ollama service not running or unreachable
            return False

        data = res.json()
        models = data.get("models", [])
        local_names = []
        for m in models:
            name = m.get("name", "")
            local_names.append(name)
            if ":" in name:
                local_names.append(name.split(":")[0])
        
        # Check if the requested model is already present
        if model_name in local_names or f"{model_name}:latest" in local_names:
            return True

        # Model not found, attempt to pull
        print(f"Ollama model '{model_name}' not found locally. Attempting to pull from library...")
        url_pull = f"{OLLAMA_HOST}/api/pull"
        payload = {"name": model_name, "stream": False}
        pull_res = requests.post(url_pull, json=payload, timeout=600)  # 10 minutes timeout
        if pull_res.status_code == 200:
            print(f"Successfully pulled Ollama model '{model_name}'")
            return True
    except Exception as e:
        print(f"Error during Ollama model verification/pull: {e}")
    return False


def query_llm(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
    """Connects to OpenAI or Ollama based on configuration, with a structured mock fallback."""
    
    if MODEL_PROVIDER == "openai" and OPENAI_API_KEY:
        try:
            if OPENAI_API_KEY.startswith("sk-or-"):
                client = OpenAI(
                    api_key=OPENAI_API_KEY,
                    base_url="https://openrouter.ai/api/v1",
                    default_headers={
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "JARVIS OS Assistant"
                    },
                    http_client=httpx.Client(trust_env=False)
                )
                model = "openai/gpt-4o-mini" if MODEL_NAME == "gpt-4o-mini" else MODEL_NAME
            else:
                client = OpenAI(
                    api_key=OPENAI_API_KEY,
                    http_client=httpx.Client(trust_env=False)
                )
                model = MODEL_NAME
 
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI/OpenRouter Query Failed: {e}. Falling back to mock/ollama.")
            
    # Try Ollama
    if MODEL_PROVIDER == "ollama" or (MODEL_PROVIDER == "openai" and not OPENAI_API_KEY):
        try:
            target_model = MODEL_NAME if MODEL_NAME != "gpt-4o-mini" else "llama3"
            # Attempt to pull if not present
            check_and_pull_ollama_model(target_model)

            url = f"{OLLAMA_HOST}/api/chat"
            payload = {
                "model": target_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "stream": False,
                "options": {"temperature": temperature}
            }
            res = requests.post(url, json=payload, timeout=120)
            if res.status_code == 200:
                data = res.json()
                return data["message"]["content"]
        except Exception as e:
            print(f"Ollama Query Failed: {e}. Falling back to Mock.")
 
    # Mock Fallback for local development offline without config keys
    return get_mock_response(system_prompt, user_prompt)



def get_mock_response(system_prompt: str, user_prompt: str) -> str:
    """Generates reasonable response strings for common operations if AI services are unavailable."""
    prompt_lower = user_prompt.lower()
    
    if "refactor" in prompt_lower or "fix" in prompt_lower:
        return """// Mock AI Refactor & Fix Result
// The requested change has been processed successfully.
function calculateMetrics(items) {
    if (!items || items.length === 0) return { total: 0, average: 0 };
    
    const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
    const average = total / items.length;
    
    return {
        total,
        average,
        count: items.length
    };
}"""
    elif "next.js" in prompt_lower or "dashboard" in prompt_lower:
        return """// Mock Next.js Component with Tailwind
import React from 'react';

export default function DashboardCard({ title, value, percentage }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-cyan-500 transition-all duration-300">
      <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
      <div className="flex justify-between items-baseline mt-4">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className={`text-xs ${percentage.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
          {percentage}
        </span>
      </div>
    </div>
  );
}"""
    else:
        return f"[JARVIS Core Mock Response]\nI received your query: '{user_prompt}'.\nPlease configure an OpenAI API key or start an Ollama model locally for advanced AI reasoning."
