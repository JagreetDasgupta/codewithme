import express from 'express';
import {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
  addParticipant,
  removeParticipant,
  joinSession
} from '../controllers/sessionController';
import { createSnapshot, listSnapshots, getSnapshot } from '../controllers/snapshotController';
import {
  startRecording,
  stopRecording,
  getRecording,
  recordEvent
} from '../controllers/recordingController';
import {
  checkPlagiarism,
  getPlagiarismChecks
} from '../controllers/plagiarismController';
import { sessionLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.route('/')
  .get(getSessions)
  .post(sessionLimiter, createSession);

router.route('/join')
  .post(joinSession);

router.route('/:id')
  .get(getSession)
  .patch(updateSession)
  .delete(deleteSession);

router.route('/:id/participants')
  .post(addParticipant);

router.route('/:id/participants/:userId')
  .delete(removeParticipant);

router.route('/:id/snapshots')
  .get(listSnapshots)
  .post(createSnapshot);

router.route('/:id/snapshots/:index')
  .get(getSnapshot);

// Recording routes
router.route('/:id/recording')
  .get(getRecording)
  .post(startRecording)
  .delete(stopRecording);

router.route('/:id/recording/events')
  .post(recordEvent);

// Plagiarism routes
router.route('/:id/plagiarism')
  .get(getPlagiarismChecks)
  .post(checkPlagiarism);

export default router;