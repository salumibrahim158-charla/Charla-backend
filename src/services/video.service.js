// Video Consultation Service using Twilio
// Enables real-time video calls between doctors and patients

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

const client = twilio(accountSid, authToken);

// Generate access token for video room
const generateVideoToken = (identity, roomName) => {
  const AccessToken = twilio.jwt.AccessToken;
  const VideoGrant = AccessToken.VideoGrant;

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: identity,
    ttl: 14400, // 4 hours
  });

  const videoGrant = new VideoGrant({
    room: roomName,
  });

  token.addGrant(videoGrant);

  return {
    token: token.toJwt(),
    identity: identity,
    roomName: roomName,
  };
};

// Create video room
const createVideoRoom = async (bookingId) => {
  try {
    const room = await client.video.rooms.create({
      uniqueName: `consultation-${bookingId}`,
      type: 'group',
      recordParticipantsOnConnect: true, // Auto record
      statusCallback: `${process.env.BACKEND_URL}/api/v1/video/callback`,
      maxParticipants: 2, // Doctor + Patient
    });

    return {
      success: true,
      roomSid: room.sid,
      roomName: room.uniqueName,
      status: room.status,
    };
  } catch (error) {
    console.error('Video room creation error:', error);
    throw error;
  }
};

// Get room details
const getRoomDetails = async (roomName) => {
  try {
    const room = await client.video.rooms(roomName).fetch();
    
    return {
      sid: room.sid,
      name: room.uniqueName,
      status: room.status,
      duration: room.duration,
      participants: room.maxParticipants,
    };
  } catch (error) {
    console.error('Get room error:', error);
    throw error;
  }
};

// End video consultation
const endVideoRoom = async (roomName) => {
  try {
    const room = await client.video.rooms(roomName).update({
      status: 'completed',
    });

    return {
      success: true,
      status: room.status,
    };
  } catch (error) {
    console.error('End room error:', error);
    throw error;
  }
};

// Get room recordings
const getRoomRecordings = async (roomSid) => {
  try {
    const recordings = await client.video.recordings.list({
      groupingSid: [roomSid],
    });

    return recordings.map(rec => ({
      sid: rec.sid,
      duration: rec.duration,
      size: rec.size,
      url: rec.links.media,
      status: rec.status,
    }));
  } catch (error) {
    console.error('Get recordings error:', error);
    throw error;
  }
};

// Controller for video consultation
const startVideoConsultation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.category; // 'patient' or 'doctor'

    // Create room
    const room = await createVideoRoom(bookingId);

    // Generate token
    const identity = `${userRole}-${userId}`;
    const accessToken = generateVideoToken(identity, room.roomName);

    res.json({
      success: true,
      data: {
        room: room,
        accessToken: accessToken.token,
        identity: identity,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Join existing consultation
const joinVideoConsultation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.category;

    const roomName = `consultation-${bookingId}`;
    const identity = `${userRole}-${userId}`;

    // Generate token
    const accessToken = generateVideoToken(identity, roomName);

    res.json({
      success: true,
      data: {
        roomName: roomName,
        accessToken: accessToken.token,
        identity: identity,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// End consultation
const endVideoConsultation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const roomName = `consultation-${bookingId}`;

    await endVideoRoom(roomName);

    // Update booking status
    // TODO: Mark booking as completed

    res.json({
      success: true,
      message: 'Consultation ended successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  generateVideoToken,
  createVideoRoom,
  getRoomDetails,
  endVideoRoom,
  getRoomRecordings,
  startVideoConsultation,
  joinVideoConsultation,
  endVideoConsultation,
};
