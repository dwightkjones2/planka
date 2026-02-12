/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
      type: 'ref',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    requestId: {
      type: 'string',
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const attachment = await Attachment.qm.createOne({
      ...values,
      cardId: values.card.id,
      creatorUserId: values.creatorUser.id,
    });

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'attachmentCreate',
      {
        item: sails.helpers.attachments.presentOne(attachment),
        requestId: inputs.requestId,
      },
      inputs.request,
    );

    const webhooks = await Webhook.qm.getAll();

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.ATTACHMENT_CREATE,
      buildData: () => ({
        item: sails.helpers.attachments.presentOne(attachment),
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [values.card],
        },
      }),
      user: values.creatorUser,
    });

    const cardSubscriptionUserIds = await sails.helpers.cards.getSubscriptionUserIds(
      values.card.id,
      values.creatorUser.id,
    );

    const boardSubscriptionUserIds = await sails.helpers.boards.getSubscriptionUserIds(
      inputs.board.id,
      values.creatorUser.id,
    );

    const notifiableUserIds = _.union(cardSubscriptionUserIds, boardSubscriptionUserIds);

    if (notifiableUserIds.length > 0) {
      await sails.helpers.notifications.createMany.with({
        webhooks,
        arrayOfValues: notifiableUserIds.map((userId) => ({
          userId,
          type: Notification.Types.ATTACHMENT_ADDED,
          data: {
            card: _.pick(values.card, ['name']),
            attachment: _.pick(attachment, ['id', 'name']),
          },
          creatorUser: values.creatorUser,
          card: values.card,
        })),
        project: inputs.project,
        board: inputs.board,
        list: inputs.list,
      });
    }

    if (!values.card.coverAttachmentId) {
      if (attachment.type === Attachment.Types.FILE && attachment.data.image) {
        await sails.helpers.cards.updateOne.with({
          webhooks,
          record: values.card,
          values: {
            coverAttachmentId: attachment.id,
          },
          project: inputs.project,
          board: inputs.board,
          list: inputs.list,
          actorUser: values.creatorUser,
        });
      }
    }

    return attachment;
  },
};
