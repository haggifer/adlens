'use client'

import { Card, Space, Tag, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

export default function Home() {
    return (
        <main
            style={{
                display: 'flex',
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}
        >
            <Card style={{ width: '100%', maxWidth: 520 }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Title level={2} style={{ marginBottom: 0 }}>
                        AdLens
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        AI-powered video ad diagnostic tool. The project scaffold is ready.
                    </Paragraph>
                    <Space wrap>
                        <Tag color="blue">Next.js</Tag>
                        <Tag color="magenta">Ant Design</Tag>
                        <Tag color="orange">Firebase</Tag>
                        <Tag color="green">React Query</Tag>
                    </Space>
                    <Text type="secondary">Waiting on the design to build out the UI.</Text>
                </Space>
            </Card>
        </main>
    )
}
