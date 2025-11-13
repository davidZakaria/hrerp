import { useState, useEffect, useCallback, useRef } from 'react';

// Simple cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  
  const {
    method = 'GET',
    body = null,
    headers = {},
    cache: enableCache = false,
    dependencies = [],
    immediate = true
  } = options;

  const fetchData = useCallback(async (customBody = null) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const cacheKey = `${method}:${url}:${JSON.stringify(customBody || body)}`;
    
    // Check cache first
    if (enableCache && method === 'GET') {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        setError(null);
        return cached.data;
      }
    }

    setLoading(true);
    setError(null);
    
    abortControllerRef.current = new AbortController();
    
    try {
      const token = localStorage.getItem('token');
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'x-auth-token': token }),
        ...headers
      };

      const config = {
        method,
        headers: defaultHeaders,
        signal: abortControllerRef.current.signal,
        ...(customBody || body ? { body: JSON.stringify(customBody || body) } : {})
      };

      const response = await fetch(`http://localhost:5001${url}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: 'Unknown error' }));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache successful GET requests
      if (enableCache && method === 'GET') {
        cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      setData(result);
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('API Error:', err);
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, method, body, enableCache, ...dependencies]);

  useEffect(() => {
    if (immediate && method === 'GET') {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  const mutate = useCallback((newBody) => {
    return fetchData(newBody);
  }, [fetchData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
    clearError
  };
};

// Hook for form submissions with optimistic updates
export const useFormSubmit = (url, options = {}) => {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async (formData, optimisticUpdate = null) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5001${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'x-auth-token': token }),
          ...options.headers
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: 'Submission failed' }));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
      return result;
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err.message || 'Submission failed');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [url, options.headers]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    submit,
    submitting,
    success,
    error,
    clearMessages
  };
};

// Cache management utilities
export const clearCache = (pattern = null) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

export const preloadData = async (url, options = {}) => {
  const cacheKey = `GET:${url}:null`;
  if (cache.has(cacheKey)) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5001${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'x-auth-token': token })
      }
    });

    if (response.ok) {
      const data = await response.json();
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.warn('Preload failed for:', url, error);
  }
}; 
