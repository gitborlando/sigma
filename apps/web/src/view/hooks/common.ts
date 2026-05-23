export function useUnmount(callback: () => void) {
  useEffect(() => {
    return callback
  }, [])
}
