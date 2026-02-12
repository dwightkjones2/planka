/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const escapeMarkdown = require('escape-markdown');
const escapeHtml = require('escape-html');

const buildTitle = (action, t) => {
  switch (action.type) {
    case Action.Types.CREATE_CARD:
      return t('Card Created');
    case Action.Types.MOVE_CARD:
      return t('Card Moved');
    case Action.Types.ADD_MEMBER_TO_CARD:
      return t('Member Added to Card');
    case Action.Types.REMOVE_MEMBER_FROM_CARD:
      return t('Member Removed from Card');
    case Action.Types.COMPLETE_TASK:
      return t('Task Completed');
    case Action.Types.UNCOMPLETE_TASK:
      return t('Task Marked Incomplete');
    default:
      return null;
  }
};

const buildBodyByFormat = (board, card, action, actorUser, t) => {
  const markdownCardLink = `[${escapeMarkdown(card.name)}](${sails.config.custom.baseUrl}/cards/${card.id})`;
  const htmlCardLink = `<a href="${sails.config.custom.baseUrl}/cards/${card.id}">${escapeHtml(card.name)}</a>`;

  switch (action.type) {
    case Action.Types.CREATE_CARD: {
      const listName = sails.helpers.lists.resolveName(action.data.list, t);

      return {
        text: t('%s created %s in %s on %s', actorUser.name, card.name, listName, board.name),
        markdown: t(
          '%s created %s in %s on %s',
          escapeMarkdown(actorUser.name),
          markdownCardLink,
          `**${escapeMarkdown(listName)}**`,
          escapeMarkdown(board.name),
        ),
        html: t(
          '%s created %s in %s on %s',
          escapeHtml(actorUser.name),
          htmlCardLink,
          `<b>${escapeHtml(listName)}</b>`,
          escapeHtml(board.name),
        ),
      };
    }
    case Action.Types.MOVE_CARD: {
      const fromListName = sails.helpers.lists.resolveName(action.data.fromList, t);
      const toListName = sails.helpers.lists.resolveName(action.data.toList, t);

      return {
        text: t(
          '%s moved %s from %s to %s on %s',
          actorUser.name,
          card.name,
          fromListName,
          toListName,
          board.name,
        ),
        markdown: t(
          '%s moved %s from %s to %s on %s',
          escapeMarkdown(actorUser.name),
          markdownCardLink,
          `**${escapeMarkdown(fromListName)}**`,
          `**${escapeMarkdown(toListName)}**`,
          escapeMarkdown(board.name),
        ),
        html: t(
          '%s moved %s from %s to %s on %s',
          escapeHtml(actorUser.name),
          htmlCardLink,
          `<b>${escapeHtml(fromListName)}</b>`,
          `<b>${escapeHtml(toListName)}</b>`,
          escapeHtml(board.name),
        ),
      };
    }
    case Action.Types.ADD_MEMBER_TO_CARD:
      return {
        text: t('%s added %s to %s on %s', actorUser.name, action.data.user.name, card.name, board.name),
        markdown: t(
          '%s added %s to %s on %s',
          escapeMarkdown(actorUser.name),
          `**${escapeMarkdown(action.data.user.name)}**`,
          markdownCardLink,
          escapeMarkdown(board.name),
        ),
        html: t(
          '%s added %s to %s on %s',
          escapeHtml(actorUser.name),
          `<b>${escapeHtml(action.data.user.name)}</b>`,
          htmlCardLink,
          escapeHtml(board.name),
        ),
      };
    case Action.Types.REMOVE_MEMBER_FROM_CARD:
      return {
        text: t('%s removed %s from %s on %s', actorUser.name, action.data.user.name, card.name, board.name),
        markdown: t(
          '%s removed %s from %s on %s',
          escapeMarkdown(actorUser.name),
          `**${escapeMarkdown(action.data.user.name)}**`,
          markdownCardLink,
          escapeMarkdown(board.name),
        ),
        html: t(
          '%s removed %s from %s on %s',
          escapeHtml(actorUser.name),
          `<b>${escapeHtml(action.data.user.name)}</b>`,
          htmlCardLink,
          escapeHtml(board.name),
        ),
      };
    case Action.Types.COMPLETE_TASK:
      return {
        text: t('%s completed %s on %s on %s', actorUser.name, action.data.task.name, card.name, board.name),
        markdown: t(
          '%s completed **%s** on %s on %s',
          escapeMarkdown(actorUser.name),
          escapeMarkdown(action.data.task.name),
          markdownCardLink,
          escapeMarkdown(board.name),
        ),
        html: t(
          '%s completed <b>%s</b> on %s on %s',
          escapeHtml(actorUser.name),
          escapeHtml(action.data.task.name),
          htmlCardLink,
          escapeHtml(board.name),
        ),
      };
    case Action.Types.UNCOMPLETE_TASK:
      return {
        text: t('%s marked %s incomplete on %s on %s', actorUser.name, action.data.task.name, card.name, board.name),
        markdown: t(
          '%s marked **%s** incomplete on %s on %s',
          escapeMarkdown(actorUser.name),
          escapeMarkdown(action.data.task.name),
          markdownCardLink,
          escapeMarkdown(board.name),
        ),
        html: t(
          '%s marked <b>%s</b> incomplete on %s on %s',
          escapeHtml(actorUser.name),
          escapeHtml(action.data.task.name),
          htmlCardLink,
          escapeHtml(board.name),
        ),
      };
    default:
      return null;
  }
};

const buildAndSendNotifications = async (services, board, card, action, actorUser, t) => {
  await sails.helpers.utils.sendNotifications(
    services,
    buildTitle(action, t),
    buildBodyByFormat(board, card, action, actorUser, t),
  );
};

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
    webhooks: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const action = await Action.qm.createOne({
      ...values,
      boardId: values.card.boardId,
      cardId: values.card.id,
      userId: values.user.id,
    });

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'actionCreate',
      {
        item: action,
      },
      inputs.request,
    );

    sails.helpers.utils.sendWebhooks.with({
      webhooks: inputs.webhooks,
      event: Webhook.Events.ACTION_CREATE,
      buildData: () => ({
        item: action,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [values.card],
        },
      }),
      user: values.user,
    });

    if (Action.INTERNAL_NOTIFIABLE_TYPES.includes(action.type)) {
      if (Action.PERSONAL_NOTIFIABLE_TYPES.includes(action.type)) {
        if (values.user.id !== action.data.user.id) {
          await sails.helpers.notifications.createOne.with({
            values: {
              action,
              userId: action.data.user.id,
              type: action.type,
              data: action.data,
              creatorUser: values.user,
              card: values.card,
            },
            project: inputs.project,
            board: inputs.board,
            list: inputs.list,
            webhooks: inputs.webhooks,
          });
        }
      } else {
        const cardSubscriptionUserIds = await sails.helpers.cards.getSubscriptionUserIds(
          action.cardId,
          action.userId,
        );

        const boardSubscriptionUserIds = await sails.helpers.boards.getSubscriptionUserIds(
          inputs.board.id,
          action.userId,
        );

        const notifiableUserIds = _.union(cardSubscriptionUserIds, boardSubscriptionUserIds);

        await sails.helpers.notifications.createMany.with({
          arrayOfValues: notifiableUserIds.map((userId) => ({
            userId,
            action,
            type: action.type,
            data: action.data,
            creatorUser: values.user,
            card: values.card,
          })),
          project: inputs.project,
          board: inputs.board,
          list: inputs.list,
          webhooks: inputs.webhooks,
        });
      }
    }

    if (Action.EXTERNAL_NOTIFIABLE_TYPES.includes(action.type)) {
      const notificationServices = await NotificationService.qm.getByBoardId(inputs.board.id);

      if (notificationServices.length > 0) {
        const services = notificationServices.map((notificationService) =>
          _.pick(notificationService, ['url', 'format']),
        );

        buildAndSendNotifications(
          services,
          inputs.board,
          values.card,
          action,
          values.user,
          sails.helpers.utils.makeTranslator(),
        );
      }
    }

    return action;
  },
};
