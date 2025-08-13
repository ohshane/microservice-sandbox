interface SSEClientConfig<Body = unknown> {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Body;
  withCredentials?: boolean;
  timeout?: number;
}

interface SSEMessage {
  data: string;
  event?: string;
  id?: string;
  retry?: number;
}

type EventCallback = (data: any) => void;

class SSEClient<Body = unknown> {
  private config: SSEClientConfig<Body>;
  private eventListeners: Map<string, EventCallback[]>;
  private abortController: AbortController | null;
  
  constructor(config: SSEClientConfig<Body>) {
    this.config = {
      method: 'GET',
      withCredentials: false,
      ...config,
      headers: {
        'Accept': 'text/event-stream',
        ...config.headers,
      },
    };
    
    this.eventListeners = new Map();
    this.abortController = null;
  }

  public addEventListener(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  public removeEventListener(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    if (listeners.length === 0) {
      this.eventListeners.delete(event);
    }
  }

  public async connect(): Promise<void> {
    this.abortController = new AbortController();
    
    try {
      // 1. 서버와 연결
      const response = await SSEFetch<Body>(this.config, this.abortController.signal);
      
      // 2. 응답 스트림을 텍스트로 디코딩
      const stream = response.body?.pipeThrough(new TextDecoderStream());
      if (!stream) {
        throw new Error('No response body');
      }
      
      // 3. 스트림 데이터 처리 시작
      this.processEventStream(stream);
    } catch (error) {
      this.dispatchEvent('error', error);
    }
  }

  public stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private async processEventStream(stream: ReadableStream<string>): Promise<void> {
    const reader = stream.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += value;
        
        // 완전한 이벤트 처리
        const events = this.extractEvents(buffer);
        buffer = events.remainder;
        
        for (const event of events.completed) {
          this.handleEvent(event);
        }
      }
    } catch (error) {
      this.dispatchEvent('error', error);
    } finally {
      reader.releaseLock();
      this.dispatchEvent('close', null);
    }
  }

  private extractEvents(buffer: string): { completed: SSEMessage[], remainder: string } {
    const events: SSEMessage[] = [];
    const lines = buffer.split(/\r\n|\r|\n/);
    
    let currentEvent: SSEMessage = { data: '' };
    let i = 0;
    
    for (; i < lines.length - 1; i++) {
      const line = lines[i];
      
      // 빈 줄은 이벤트의 끝을 의미
      if (line === '') {
        if (currentEvent.data) {
          events.push({ ...currentEvent });
          currentEvent = { data: '' };
        }
        continue;
      }
      
      // 데이터 라인 파싱
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const field = line.slice(0, colonIndex).trim();
      // 콜론 뒤에 공백이 있으면 제거
      const value = colonIndex <= line.length - 1 
        ? line.slice(colonIndex + 1).trim()
        : '';
      
      if (field === 'data') {
        currentEvent.data = currentEvent.data 
          ? currentEvent.data + '\n' + value 
          : value;
      } else if (field === 'event') {
        currentEvent.event = value;
      } else if (field === 'id') {
        currentEvent.id = value;
      } else if (field === 'retry') {
        const retry = parseInt(value, 10);
        if (!isNaN(retry)) {
          currentEvent.retry = retry;
        }
      }
    }
    
    // 마지막 이벤트가 완성되었는지 확인
    if (i < lines.length && lines[i] === '' && currentEvent.data) {
      events.push({ ...currentEvent });
      return { completed: events, remainder: lines.slice(i + 1).join('\n') };
    }
    
    return { 
      completed: events, 
      remainder: lines.slice(Math.max(0, i)).join('\n') 
    };
  }

  private handleEvent(eventData: SSEMessage): void {
    try {
      // 이벤트 타입이 지정되지 않은 경우 기본값은 'message'
      const eventType = eventData.event || 'message';
      
      // 데이터가 JSON 형식인지 확인하고 파싱
      let parsedData;
      try {
        parsedData = JSON.parse(eventData.data);
      } catch (e) {
        parsedData = eventData.data;
      }
      
      // 이벤트 발생
      this.dispatchEvent(eventType, parsedData);
    } catch (error) {
      this.dispatchEvent('error', error);
    }
  }

  private dispatchEvent(event: string, data: any): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event handler:`, error);
        }
      }
    }
  }
}

// Fetch API를 이용한 SSE 요청 함수
async function SSEFetch<Body>(
  config: SSEClientConfig<Body>, 
  signal?: AbortSignal
): Promise<Response> {
  const { url, method, headers, body, withCredentials } = config;
  
  const options: RequestInit = {
    method,
    headers,
    signal,
    credentials: withCredentials ? 'include' : 'same-origin',
  };
  
  if (method === 'POST' && body) {
    options.body = JSON.stringify(body);
    // Content-Type 헤더 추가
    (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('Response has no body');
  }
  
  return response;
}

export { SSEClient, type SSEClientConfig, type SSEMessage };