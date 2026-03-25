
export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const userStr = localStorage.getItem('pad_user');
  let headers = new Headers(options.headers || {});

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      headers.set('x-user-id', user.id);
      headers.set('x-user-name', user.name);
    } catch (e) {
      console.error('Error parsing user for apiRequest', e);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Not a JSON response, use default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
