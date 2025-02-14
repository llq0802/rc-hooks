/**
 * title: 基础用法
 * desc: 在组件首次渲染时，执行方法。
 */

import React, { useState } from 'react';
import { Button, message } from 'antd';
import { useMount } from 'rc-hooks';

const MyComponent = () => {
  useMount(() => {
    message.info('mount');
  });

  return <div>Hello World</div>;
};

function Demo() {
  const [state, toggle] = useState(false);

  return (
    <>
      <Button onClick={() => toggle((s) => !s)}>{state ? 'unmount' : 'mount'}</Button>
      {state && <MyComponent />}
    </>
  );
}

export default Demo;
