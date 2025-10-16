import { useEffect, useRef } from 'react'

export function useDebounce(callback: () => void, delay: number, deps: any[]) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 新しいタイマーを設定
    timeoutRef.current = setTimeout(callback, delay)

    // クリーンアップ
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, deps)

  // コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
}