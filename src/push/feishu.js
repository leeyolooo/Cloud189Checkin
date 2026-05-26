module.exports = {
  webhookUrl: process.env.FEISHU_WEBHOOK_URL || '',
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  receiveId: process.env.FEISHU_RECEIVE_ID || '',
  idType: process.env.FEISHU_ID_TYPE || 'open_id',
};
