/**
 * title: 手动触发
 * desc: 通过设置 `options.autoRun = false` , 则需要手动调用 `run` 时才会触发执行异步函数。
 */

import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import { useAsync } from 'rc-hooks';
import changeUsername from './services/changeUsername';

function Demo() {
  const [state, setState] = useState('');
  const { loading, run } = useAsync(changeUsername, {
    autoRun: false,
    onSuccess: (result, params) => {
      if (result.success) {
        setState('');
        message.success(`The username was changed to "${params[0]}" !`);
      }
    }
  });

  return (
    <div>
      <Input
        onChange={(e) => setState(e.target.value)}
        value={state}
        placeholder="Please enter username"
        style={{ width: 240, marginRight: 16 }}
      />
      <Button onClick={() => run(state)} loading={loading}>
        Edit
      </Button>
    </div>
  );
}

export default Demo;
