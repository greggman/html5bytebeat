export const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const encode = b => btoa(String.fromCharCode(...new Uint8Array(b)));
export const decodeToString = s => new TextDecoder().decode(decode(s));
export const encodeString = s => encode(new TextEncoder().encode(s));
