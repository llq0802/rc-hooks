/**
 * title: 基础用法
 */
import React from 'react';
import { Button, Spin, List, Typography } from 'antd';
import { useLoadMore } from 'rc-hooks';
import getUserList from './services/getUserList';

function Demo() {
  const { data, loading, loadingMore, noMore, loadMore } = useLoadMore(
    ({ current }) => getUserList({ current }).then((res) => ({ total: res.total, list: res.data })),
    {
      isNoMore: (result) => !!result && result.list.length >= result.total
    }
  );

  return (
    <div>
      <Spin spinning={loading && !loadingMore}>
        <List
          dataSource={data?.list}
          renderItem={(item: { id: string; name: string }) => (
            <List.Item key={item.id}>
              <Typography.Text mark>[{item.id}]</Typography.Text> {item.name}
            </List.Item>
          )}
        />
      </Spin>
      <Button onClick={loadMore} loading={loadingMore} disabled={noMore || loading}>
        {noMore ? 'No more data' : 'Click to load more'}
      </Button>
    </div>
  );
}

export default Demo;
