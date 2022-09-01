const delay = async (val: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), val)
  })
}

export { delay }
