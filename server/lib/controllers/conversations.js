const { Router } = require('express');
const Conversations = require('../models/Conversations.js');
const AWSUser = require('../models/AWSUser.js');
const getRedisClient = require('../../redisClient.js');

module.exports = Router()
  .post('/', async (req, res, next) => {
    try {
      const senderSub = req.userAWSSub;
      const { participantSubs } = req.body;
      const redisClient = await getRedisClient();

      if (participantSubs.length === 0) {
        return res.status(400).json({
          message: 'Missing conversation participants.',
        });
      }
      // Check if all participants exist
      for (const sub of participantSubs) {
        const userExists = await AWSUser.getCognitoUserBySub({ sub });
        if (!userExists) {
          return res.status(400).json({
            message: `User with sub ${sub} does not exist.`,
          });
        }
      }
      // Include sender in participants if not already included
      if (!participantSubs.includes(senderSub)) {
        participantSubs.push(senderSub);
      }

      // Try to find an existing conversation with these participants
      const existingConversationId = await Conversations.findConversationByParticipants(
        participantSubs,
        senderSub
      );

      // unhide conversation so it's detected by front end fetch to reinstate same convo
      if (existingConversationId) {
        await Conversations.undeleteConversation(senderSub, existingConversationId);

        // Invalidate cache for all participants
        for (const participantSub of participantSubs) {
          await redisClient.del(`conversation:${participantSub}`);
        }

        return res.json({
          conversationExists: true,
          success: true,
          conversationId: existingConversationId,
        });
      }

      // No conversation exists with exactly these participants, so create one.
      const conversationId = await Conversations.createConversation(participantSubs, senderSub);

      // Invalidate cache for all participants
      for (const participantSub of participantSubs) {
        await redisClient.del(`conversation:${participantSub}`);
      }

      res.json({
        success: true,
        conversationId,
      });
    } catch (e) {
      if (e.code === '23505' || e.constraint === 'conversation_participants_pkey') {
        return res.status(400).json({
          code: 400,
          message: 'Cannot add duplicate participants to conversation',
        });
      }
      next(e);
    }
  })

  .post('/messages', async (req, res, next) => {
    try {
      const senderSub = req.userAWSSub;
      const { conversationId, content } = req.body;
      const redisClient = await getRedisClient();

      if (content.length === 0) {
        return res.status(400).send({ message: 'Message length can not be 0.' });
      }

      // Check cache first for conversations
      const cacheKey = `conversation:${senderSub}`;
      let conversations;
      const cachedConversations = await redisClient.get(cacheKey);

      if (cachedConversations) {
        conversations = JSON.parse(cachedConversations);
      } else {
        conversations = await Conversations.getConversationsForUser(senderSub);
        // Cache for 5 minutes
        await redisClient.set(cacheKey, JSON.stringify(conversations), {
          EX: 300,
        });
      }

      // make sure sender is a participant
      const isParticipant = conversations.some((conv) => conv.id === conversationId);

      if (!isParticipant) {
        return res.status(403).json({
          message: 'You are not a participant in this conversation.',
        });
      }

      const result = await Conversations.createMessage({
        conversation_id: conversationId,
        sender_sub: senderSub,
        content,
      });

      // Retrieve the io instance
      const io = req.app.get('io');

      // Get the list of participants in the conversation.
      const participants = await Conversations.getConversationParticipants(conversationId);

      // For each recipient (everyone except the sender), get their updated unread count and broadcast the event.
      for (const participantSub of participants) {
        await redisClient.del(`conversation:${participantSub}`);

        if (participantSub !== senderSub) {
          const updatedUnreadCount = await Conversations.getIsReadCount(participantSub);
          io.emit('new message', {
            recipient: participantSub, // Identifies the intended recipient.
            unreadCount: updatedUnreadCount.unread_count, // The recipient's current unread count.
            conversationId,
            senderSub,
            content,
          });
        }
      }

      res.json({
        success: true,
        message: result.message.content || null,
        isNewConversation: result.isNewConversation,
        newConversationId: result.isNewConversation ? result.newConversationId : null,
      });
    } catch (e) {
      next(e);
    }
  })

  .get('/', async (req, res, next) => {
    const userSub = req.userAWSSub;
    const cacheKey = `conversation:${userSub}`;

    try {
      const redisClient = await getRedisClient();

      // Step 1: Check Redis first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.info('Serving conversations from Redis cache');
        return res.json(JSON.parse(cachedData));
      }
      // Step 2: If not cached, fetch from Postgres
      console.info('Fetching conversations from Postgres');
      const conversations = await Conversations.getConversationsForUser(userSub);

      // Step 3: Store in Redis with a 5-minute expiration
      await redisClient.set(cacheKey, JSON.stringify(conversations), {
        EX: 300,
      });

      res.json(conversations);
    } catch (e) {
      next(e);
    }
  })

  .get('/:id/messages', async (req, res, next) => {
    try {
      const userSub = req.userAWSSub;
      const conversationId = parseInt(req.params.id);

      const isValidConversationId = Number.isFinite(conversationId);

      if (!isValidConversationId) {
        return res.status(400).json({ code: 400, message: 'Invalid conversation ID.' });
      }
      // Check if user is part of the conversation
      const isParticipant = await Conversations.isUserParticipant(conversationId, userSub);

      if (!isParticipant) {
        return res.status(403).json({
          message: 'You are not a participant in this conversation.',
        });
      }

      const messages = await Conversations.getMessagesForConversation(conversationId, userSub);

      res.json(messages);
    } catch (e) {
      next(e);
    }
  })

  .delete('/:id', async (req, res, next) => {
    try {
      const userSub = req.userAWSSub;
      const conversationId = parseInt(req.params.id);

      await Conversations.deleteConversation(conversationId, userSub);

      const redisClient = await getRedisClient();
      await redisClient.del(`conversation:${userSub}`);

      res.json({ success: true, message: 'Conversation deleted.' });
    } catch (e) {
      next(e);
    }
  })

  .get('/unread-count', async (req, res, next) => {
    try {
      const userSub = req.userAWSSub;

      const unreadCount = await Conversations.getIsReadCount(userSub);

      res.json({ unreadCount: parseInt(unreadCount.unread_count, 10) });
    } catch (e) {
      next(e);
    }
  })

  .put('/mark-read', async (req, res, next) => {
    try {
      const userSub = req.userAWSSub;
      const { conversationId } = req.body;

      const updatedRows = await Conversations.markAsRead({
        conversationId,
        userSub,
      });

      if (updatedRows === 0) {
        return res.status(200).json({ message: 'No messages were marked as read.' });
      }

      const redisClient = await getRedisClient();
      await redisClient.del(`conversation:${userSub}`);

      res.json({
        success: true,
        message: 'Messages successfully marked as read.',
      });
    } catch (e) {
      next(e);
    }
  });
