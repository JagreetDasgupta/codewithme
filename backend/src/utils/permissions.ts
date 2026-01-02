import { ParticipantModel } from '../models/participant';

export const isInterviewer = async (sessionId: string, userId: string) => {
  try {
    const participants = await ParticipantModel.findBySessionId(sessionId);
    return participants.some(p => p.user_id === userId && p.role === 'interviewer');
  } catch {
    return false;
  }
};