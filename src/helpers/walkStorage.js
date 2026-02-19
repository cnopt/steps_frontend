import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const getWalksWriteDirectory = () => {
  return Capacitor.getPlatform() === 'android' ? Directory.Data : Directory.Documents;
};

export const getWalksMirrorWriteDirectories = () => {
  // Mirror Android writes into Documents so files are visible to users.
  return Capacitor.getPlatform() === 'android' ? [Directory.Documents] : [];
};

export const getWalksWriteDirectories = () => {
  return [getWalksWriteDirectory(), ...getWalksMirrorWriteDirectories()];
};

export const getWalksReadDirectories = () => {
  const writeDirectory = getWalksWriteDirectory();
  // Keep Documents as a fallback on Android to preserve access to older files.
  if (writeDirectory === Directory.Data) {
    return [Directory.Data, Directory.Documents];
  }
  return [Directory.Documents];
};

export const readFileFromWalkDirectories = async (options) => {
  const directories = getWalksReadDirectories();
  let lastError = null;

  for (const directory of directories) {
    try {
      return await Filesystem.readFile({ ...options, directory });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to read file from walk storage directories');
};

export const ensureWalksDirectory = async (path) => {
  const directories = getWalksWriteDirectories();
  let primaryError = null;

  for (let i = 0; i < directories.length; i += 1) {
    const directory = directories[i];
    try {
      await Filesystem.mkdir({
        path,
        directory,
        recursive: true
      });
    } catch (error) {
      // Ignore "already exists"; fail only if primary write target cannot be prepared.
      if (i === 0) {
        primaryError = error;
      }
    }
  }

  if (primaryError) {
    throw primaryError;
  }
};

export const writeFileToWalkDirectories = async (options) => {
  const directories = getWalksWriteDirectories();
  let primaryError = null;

  for (let i = 0; i < directories.length; i += 1) {
    const directory = directories[i];
    try {
      await Filesystem.writeFile({
        ...options,
        directory
      });
    } catch (error) {
      if (i === 0) {
        primaryError = error;
      }
    }
  }

  if (primaryError) {
    throw primaryError;
  }
};

export const deleteFileFromWalkDirectories = async (path) => {
  const directories = getWalksWriteDirectories();
  let primaryError = null;

  for (let i = 0; i < directories.length; i += 1) {
    const directory = directories[i];
    try {
      await Filesystem.deleteFile({
        path,
        directory
      });
    } catch (error) {
      if (i === 0) {
        primaryError = error;
      }
    }
  }

  if (primaryError) {
    throw primaryError;
  }
};
