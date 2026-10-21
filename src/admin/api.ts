import type { EditableContent } from '../content/runtime'

/** The API is one PHP file, called directly — this works on any host, without rewrite rules. */
const endpoint = (route: string) => `/api/index.php?r=${route}`

// every mutating request carries this header; the server rejects requests without it (CSRF guard)
const HEADERS = { 'x-requested-with': 'cms' }

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? HEADERS : { ...HEADERS, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error ?? `Request failed (${res.status})`), { status: res.status })
  return data as T
}

type Upload = { url: string; type: 'image' | 'video' }

export const api = {
  me: () => request<{ username: string }>('GET', endpoint('me')),
  login: (username: string, password: string) => request<{ username: string }>('POST', endpoint('login'), { username, password }),
  logout: () => request('POST', endpoint('logout'), {}),
  content: () => request<Partial<EditableContent>>('GET', endpoint('content')),
  save: (content: EditableContent) => request<{ savedAt: string }>('PUT', endpoint('content'), content),

  /** Upload one image or video, reporting progress 0…1. */
  upload(file: File, onProgress?: (p: number) => void) {
    return new Promise<Upload>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', endpoint('upload'))
      xhr.setRequestHeader('x-requested-with', 'cms')
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
      xhr.onload = () => {
        const data = (() => {
          try {
            return JSON.parse(xhr.responseText)
          } catch {
            return {}
          }
        })()
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(new Error(data.error ?? `Upload failed (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Upload failed — check your connection'))
      const form = new FormData()
      form.append('file', file)
      xhr.send(form)
    })
  },
}
