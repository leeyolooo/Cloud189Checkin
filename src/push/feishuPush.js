const superagent = require("superagent");
const feishu = require("./feishu");
const { log4js } = require("../logger");

const logger = log4js.getLogger("feishu");
logger.addContext("user", "feishu");

const buildCard = (signResults) => {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const validResults = signResults.filter(r => r);
  const allSuccess = validResults.length > 0 && validResults.every(r => !r.error);

  const elements = [];

  if (!validResults.length) {
    elements.push({
      tag: "div",
      text: { tag: "lark_md", content: "⚠️ 未获取到签到结果" },
    });
  } else {
    for (const r of validResults) {
      if (r.error) {
        elements.push({
          tag: "div",
          text: { tag: "lark_md", content: `📧 **${r.userName}**\n❌ 签到异常：${r.error}` },
        });
      } else {
        const reward = r.netdiskBonus > 0 ? `🎁 ${r.netdiskBonus}M 空间` : "ℹ️ 今日已签到";
        elements.push({
          tag: "div",
          text: { tag: "lark_md", content: `📧 **${r.userName}**\n✅ 签到成功\n${reward}` },
        });
      }
      elements.push({ tag: "hr" });
    }
    if (elements.length && elements[elements.length - 1].tag === "hr") {
      elements.pop();
    }
  }

  elements.push({
    tag: "note",
    elements: [{ tag: "plain_text", content: `⏰ ${now}` }],
  });

  return {
    header: {
      title: { tag: "plain_text", content: allSuccess ? "✅ 天翼云盘签到成功" : "⚠️ 天翼云盘签到结果" },
      template: allSuccess ? "green" : "orange",
    },
    elements,
  };
};

// 飞书自定义机器人 Webhook
const sendWebhook = (card) => {
  if (!feishu.webhookUrl) {
    logger.info("未配置飞书Webhook，跳过");
    return Promise.resolve();
  }

  return superagent
    .post(feishu.webhookUrl)
    .send({ msg_type: "interactive", card })
    .then(() => {
      logger.info("飞书Webhook推送成功");
    })
    .catch((err) => {
      logger.error(`飞书Webhook推送失败: ${err.message}`);
    });
};

// 飞书应用机器人
const sendAppMessage = (card) => {
  if (!feishu.appId || !feishu.appSecret || !feishu.receiveId) {
    logger.info("未配置飞书应用机器人，跳过");
    return Promise.resolve();
  }

  return superagent
    .post("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal")
    .send({ app_id: feishu.appId, app_secret: feishu.appSecret })
    .then((res) => {
      const token = res.body.tenant_access_token;
      if (!token) {
        logger.error("飞书应用获取token失败");
        return;
      }
      return superagent
        .post(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${feishu.idType}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          receive_id: feishu.receiveId,
          msg_type: "interactive",
          content: JSON.stringify(card),
        })
        .then(() => {
          logger.info("飞书应用推送成功");
        })
        .catch((err) => {
          logger.error(`飞书应用推送失败: ${err.message}`);
        });
    })
    .catch((err) => {
      logger.error(`飞书应用获取token失败: ${err.message}`);
    });
};

const pushFeishu = async (signResults) => {
  const card = buildCard(signResults || []);
  logger.info(`飞书推送开始，共 ${signResults.length} 个账号结果`);
  await Promise.all([sendWebhook(card), sendAppMessage(card)]);
  logger.info("飞书推送完毕");
};

module.exports = pushFeishu;
