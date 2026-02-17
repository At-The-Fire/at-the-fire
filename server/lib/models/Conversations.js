const pool = require('../../lib/utils/pool.js');
const { encrypt, decrypt } = require('../services/encryption.js');

module.exports = class Conversations {
  id;
  conversation_id;
  sender_sub;
  content;
  created_at;
  is_read;
  sender;

  constructor(row) {
    this.id = row.id;
    this.conversation_id = row.conversation_id;
    this.sender_sub = row.sender_sub;
    // this.content = row.content;
    this.content = row.content ? decrypt(row.content) : null;
    this.created_at = row.created_at;
    this.is_read = row.is_read;
  }

  static async createMessage({ conversation_id, sender_sub, content }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create message
      const { rows } = await client.query(
        `INSERT INTO messages (conversation_id, sender_sub, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [conversation_id, sender_sub, encrypt(content)]
      );

      // Mark first message sent
      await client.query(
        `
        UPDATE conversation_visibility
        SET first_message_sent = TRUE
        WHERE conversation_id = $1

          `,
        [conversation_id]
      );
      // If any recipient had hidden the conversation, make it visible for them again
      await client.query(
        `UPDATE conversation_visibility 
         SET is_visible = TRUE 
         WHERE conversation_id = $1 
         AND user_sub != $2 
         AND is_visible = FALSE`,
        [conversation_id, sender_sub]
      );

      await client.query('COMMIT');
      return {
        message: new Conversations(rows[0]),
        isNewConversation: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async createConversation(participantSubs, senderSub) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create conversation
      const { rows } = await client.query(
        'INSERT INTO conversations DEFAULT VALUES RETURNING id'
      );
      const conversationId = rows[0].id;

      // Add participants and visibility records
      for (const sub of participantSubs) {
        await client.query(
          'INSERT INTO conversation_participants (conversation_id, user_sub) VALUES ($1, $2)',
          [conversationId, sub]
        );

        const isSender = sub === senderSub;
        await client.query(
          'INSERT INTO conversation_visibility (conversation_id, user_sub, is_visible, sender) VALUES ($1, $2, TRUE, $3)',
          [conversationId, sub, isSender]
        );
      }

      await client.query('COMMIT');
      return conversationId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getConversationsForUser(userSub) {
    const { rows } = await pool.query(
      `
      SELECT 
  c.id,
  c.created_at,
  c.updated_at,
  cv.sender AS is_sender,
  cv.first_message_sent AS first_message_sent,
  (
    SELECT COUNT(*)
    FROM messages
    WHERE conversation_id = c.id
      AND is_read = FALSE
      AND sender_sub <> $1
  ) AS unread_count,
  json_agg(
    json_build_object(
      'sub', cu.sub,
      'first_name', cu.first_name,
      'last_name', cu.last_name,
      'image_url', cu.image_url,
      'display_name', sc.display_name,
      'logo_image_url', sc.logo_image_url
    )
  ) AS participants,
  (
    SELECT json_build_object(
      'id', m.id,
      'content', m.content,
      'sender_sub', m.sender_sub,
      'sender_first_name', cu2.first_name,
      'sender_last_name', cu2.last_name,
      'sender_avatar', cu2.image_url,
      'sender_display_name', sc2.display_name,
      'sender_logo', sc2.logo_image_url,
      'created_at', m.created_at
    )
    FROM messages m
    JOIN cognito_users cu2 ON m.sender_sub = cu2.sub
    LEFT JOIN stripe_customers sc2 ON cu2.sub = sc2.aws_sub
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message
FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id
JOIN cognito_users cu ON cp.user_sub = cu.sub
LEFT JOIN stripe_customers sc ON cu.sub = sc.aws_sub
JOIN conversation_visibility cv ON c.id = cv.conversation_id AND cv.user_sub = $1
WHERE cv.is_visible = TRUE
GROUP BY c.id, cv.sender, cv.first_message_sent
ORDER BY c.updated_at DESC;

    `,
      [userSub]
    );

    // Decrypt and remove duplicates in Node
    for (const row of rows) {
      // 1) Decrypt participants
      const uniqueSubs = new Set();
      const decryptedParticipants = [];

      for (const p of row.participants) {
        if (!uniqueSubs.has(p.sub)) {
          uniqueSubs.add(p.sub);

          const firstName = p.first_name ? p.first_name : null;
          const lastName = p.last_name ? p.last_name : null;
          const userAvatar = p.image_url ? p.image_url : null;
          const displayName = p.display_name ? p.display_name : null;
          const logoImage = p.logo_image_url ? p.logo_image_url : null;

          decryptedParticipants.push({
            sub: p.sub,
            firstName,
            lastName,
            userAvatar,
            displayName,
            logoImage,
          });
        }
      }
      row.participants = decryptedParticipants;

      // 2) Decrypt fields on last_message if it exists
      if (row.last_message) {
        const {
          sender_sub,
          sender_first_name,
          sender_last_name,
          sender_email,
          content,
          sender_display_name,
          sender_logo,
        } = row.last_message;

        const decryptedFirstName = sender_first_name
          ? decrypt(sender_first_name)
          : null;
        const decryptedLastName = sender_last_name
          ? decrypt(sender_last_name)
          : null;
        const decryptedEmail = sender_email ? decrypt(sender_email) : null;
        const decryptedContent = content ? decrypt(content) : null;

        // Attach name or business name
        row.last_message.sender_display_user_name =
          sender_display_name || // Plain text, no decryption
          (decryptedFirstName && decryptedLastName
            ? `${decryptedFirstName} ${decryptedLastName}`
            : decryptedEmail || 'Unknown user');

        // Attach logo if available
        row.last_message.sender_logo = sender_logo || null;

        // Keep sub around in case you need it
        row.last_message.sender_sub = sender_sub;

        // Add decrypted content
        row.last_message.content = decryptedContent;

        // Remove raw encrypted fields if you don’t want them
        delete row.last_message.sender_first_name;
        delete row.last_message.sender_last_name;
        delete row.last_message.sender_email;
      }
    }

    return rows;
  }

  static async getMessagesForConversation(conversationId, userSub) {
    // First check if this user has ever hidden this conversation
    const {
      rows: [visibility],
    } = await pool.query(
      `SELECT hidden_at, is_visible
       FROM conversation_visibility 
       WHERE conversation_id = $1 AND user_sub = $2`,
      [conversationId, userSub]
    );

    // Get messages based on user's status
    const { rows } = await pool.query(
      `SELECT m.*, 
              json_build_object(
                'sub', cu.sub
                ) as sender
       FROM messages m
       JOIN cognito_users cu ON m.sender_sub = cu.sub
       WHERE m.conversation_id = $1
       ${visibility?.hidden_at ? 'AND m.created_at > $2' : ''}
       ORDER BY m.created_at ASC`,
      visibility?.hidden_at
        ? [conversationId, visibility.hidden_at]
        : [conversationId]
    );
    // Decrypt all message contents
    return rows.map((message) => ({
      ...message,
      content: decrypt(message.content),
    }));
  }

  static async deleteConversation(conversationId, userSub) {
    await pool.query(
      `INSERT INTO conversation_visibility (conversation_id, user_sub, is_visible, hidden_at)
       VALUES ($1, $2, FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (conversation_id, user_sub) 
       DO UPDATE SET is_visible = FALSE, hidden_at = CURRENT_TIMESTAMP`,
      [conversationId, userSub]
    );
  }

  static async getIsReadCount(userSub) {
    const { rows } = await pool.query(
      `
      SELECT COUNT(*) AS unread_count
      FROM messages m
      JOIN conversation_visibility cv ON m.conversation_id = cv.conversation_id
      WHERE m.is_read = FALSE
       AND m.sender_sub <> $1 
       AND cv.user_sub = $1
       AND cv.is_visible = TRUE  -- Only count unread messages from visible conversations
      `,
      [userSub]
    );

    return rows[0];
  }

  static async markAsRead({ conversationId, userSub }) {
    const { rowCount } = await pool.query(
      `
      UPDATE messages
      SET is_read = TRUE
      FROM conversation_visibility cv
      WHERE messages.conversation_id = $1
      AND messages.sender_sub <> $2
      AND messages.is_read = FALSE
      AND cv.conversation_id = messages.conversation_id
      AND cv.user_sub = $2
      AND cv.is_visible = TRUE
      `,
      [conversationId, userSub]
    );
    return rowCount;
  }

  static async isUserParticipant(conversationId, userSub) {
    const { rows } = await pool.query(
      `SELECT 1 FROM conversation_participants 
       WHERE conversation_id = $1 AND user_sub = $2`,
      [conversationId, userSub]
    );

    return rows.length > 0;
  }

  static async getConversationParticipants(conversationId) {
    const { rows } = await pool.query(
      `
      SELECT user_sub 
      FROM conversation_participants 
      WHERE conversation_id = $1
      `,
      [conversationId]
    );
    return rows.map((row) => row.user_sub);
  }

  static async findConversationByParticipants(participantSubs) {
    const query = `
SELECT cp.conversation_id
FROM (
  SELECT conversation_id, array_agg(user_sub ORDER BY user_sub) AS participants
  FROM conversation_participants
  GROUP BY conversation_id
) cp
WHERE cp.participants = (
  SELECT array_agg(user_sub ORDER BY user_sub)
  FROM unnest($1::text[]) AS user_sub
)
  AND EXISTS (
    SELECT 1
    FROM conversation_visibility cv
    WHERE cv.conversation_id = cp.conversation_id
      AND cv.is_visible = TRUE
  )
LIMIT 1;

  `;
    const values = [participantSubs];
    const { rows } = await pool.query(query, values);
    return rows.length > 0 ? rows[0].conversation_id : null;
  }

  static async undeleteConversation(senderSub, conversationId) {
    const { rows } = await pool.query(
      `
      UPDATE conversation_visibility
      SET is_visible = TRUE
      WHERE user_sub = $1 
      AND conversation_id = $2
    
    `,
      [senderSub, conversationId]
    );

    if (!rows) return null;

    return rows[0];
  }
};
