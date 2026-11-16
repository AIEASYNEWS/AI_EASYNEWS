export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}

export function publicError(error) {
  if (error instanceof AppError) return { code: error.code, message: error.message, status: error.status }
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return { code: 'REQUEST_TIMEOUT', message: '응답을 기다리는 시간이 길어졌어요. 잠시 후 다시 시도해 주세요.', status: 504 }
  }
  return { code: 'SERVER_ERROR', message: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.', status: 500 }
}
