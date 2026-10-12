// Duration is content-led by default; the engine retains its segment ceiling.
export function resolveProductionOptions(options = {}) {
  if (options.variableLength !== undefined && typeof options.variableLength !== 'boolean') {
    throw new Error('variableLength 必须是布尔值');
  }
  return {...options, variableLength: options.variableLength ?? true};
}

export function parseProjectArgs(args) {
  const options = {};
  let output, durationFlag;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--variable-length' || flag === '--fixed-length') {
      if (durationFlag && durationFlag !== flag) throw new Error('不能同时指定可变时长与固定时长');
      durationFlag = flag;
      options.variableLength = flag === '--variable-length';
    } else if (flag === '--allow-music') options.allowMusic = true;
    else if ((flag === '--mode' || flag === '--out') && args[i + 1] && !args[i + 1].startsWith('--')) {
      const value = args[++i];
      if (flag === '--mode') options.mode = value;
      else output = value;
    } else throw new Error('未知参数或缺少参数值');
  }
  return {options: resolveProductionOptions(options), output};
}
