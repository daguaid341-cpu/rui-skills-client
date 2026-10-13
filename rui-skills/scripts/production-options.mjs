// Duration is content-led by default; the engine retains its segment ceiling.
export function resolveProductionOptions(options = {}) {
  if (options.variableLength !== undefined && typeof options.variableLength !== 'boolean') {
    throw new Error('variableLength 必须是布尔值');
  }
  if (options.detail !== undefined && !['compact','full'].includes(options.detail)) throw new Error('detail 必须是 compact 或 full');
  if (options.timing !== undefined && !['sequence','seconds'].includes(options.timing)) throw new Error('timing 必须是 sequence 或 seconds');
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
    else if (['--mode','--out','--detail','--timing'].includes(flag) && args[i + 1] && !args[i + 1].startsWith('--')) {
      const value = args[++i];
      if (flag === '--out') output = value;
      else options[flag.slice(2)] = value;
    } else throw new Error('未知参数或缺少参数值');
  }
  return {options: resolveProductionOptions(options), output};
}
