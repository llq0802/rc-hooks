/**
 * title: 基础用法
 * desc: 获取 h1 元素大小及其相对于视口的位置。
 */

import React from 'react';
import { useClientRect } from 'rc-hooks';

function Demo() {
  const [rect, ref] = useClientRect();

  return (
    <>
      <h1 ref={ref}>Hello, world</h1>
      {rect !== null && <p>rect value: {JSON.stringify(rect)}</p>}
    </>
  );
}

export default Demo;
