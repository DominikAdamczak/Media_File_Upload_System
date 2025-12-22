import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useUploadStore } from '@/store/uploadStore';
import { UploadFile } from '@/types/upload';
import { getConnectionWarning } from '@/config/api.config';

export default function UploadScreen() {
  const { files, addFiles, startUpload, removeFile, pauseUpload, resumeUpload, cancelUpload } =
    useUploadStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const fileList = Array.from(files.values());

  useEffect(() => {
    const warning = getConnectionWarning();
    if (warning) {
      setShowWarning(true);
    }
  }, []);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const uploadFiles: UploadFile[] = result.assets.map((asset) => ({
          id: `${asset.name}-${Date.now()}-${Math.random()}`,
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
          status: 'pending',
          progress: 0,
          uploadedChunks: 0,
          totalChunks: 0,
          retryCount: 0,
        }));

        addFiles(uploadFiles);
        uploadFiles.forEach((file) => startUpload(file.id));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick files');
      console.error(error);
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uploadFile: UploadFile = {
          id: `camera-${Date.now()}`,
          uri: asset.uri,
          name: `photo-${Date.now()}.jpg`,
          type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          size: asset.fileSize || 0,
          status: 'pending',
          progress: 0,
          uploadedChunks: 0,
          totalChunks: 0,
          retryCount: 0,
        };

        addFiles([uploadFile]);
        startUpload(uploadFile.id);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture from camera');
      console.error(error);
    }
  };

  const handleFileAction = (file: UploadFile) => {
    switch (file.status) {
      case 'uploading':
        pauseUpload(file.id);
        break;
      case 'paused':
        resumeUpload(file.id);
        break;
      case 'failed':
        startUpload(file.id);
        break;
      case 'pending':
      case 'completed':
      case 'cancelled':
        removeFile(file.id);
        break;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'uploading':
        return '#2196F3';
      case 'paused':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getActionButtonText = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Pause';
      case 'paused':
        return 'Resume';
      case 'failed':
        return 'Retry';
      default:
        return 'Remove';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderFileItem = ({ item }: { item: UploadFile }) => (
    <View style={styles.fileItem}>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          {item.status === 'uploading' && (
            <Text style={styles.progressText}> - {item.progress}%</Text>
          )}
        </View>
        {item.error && <Text style={styles.errorText}>{item.error}</Text>}
      </View>

      {item.status === 'uploading' && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => handleFileAction(item)}
        >
          <Text style={styles.buttonText}>{getActionButtonText(item.status)}</Text>
        </TouchableOpacity>
        {item.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => {
              if (item.uploadId) {
                cancelUpload(item.id);
              }
              removeFile(item.id);
            }}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Media File Upload</Text>
        <Text style={styles.subtitle}>Upload images and videos to the server</Text>
      </View>

      {showWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Configuration Required</Text>
            <Text style={styles.warningText}>
              Update API_URL in config/api.config.ts with your computer's IP address to connect to the backend.
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowWarning(false)}>
            <Text style={styles.warningClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.pickButton} onPress={pickFiles}>
          <Text style={styles.pickButtonText}>📁 Pick Files</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickButton} onPress={pickFromCamera}>
          <Text style={styles.pickButtonText}>📷 Camera</Text>
        </TouchableOpacity>
      </View>

      {fileList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No files selected</Text>
          <Text style={styles.emptySubtext}>Tap the buttons above to select files or take a photo</Text>
        </View>
      ) : (
        <FlatList
          data={fileList}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  pickButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  fileItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fileInfo: {
    marginBottom: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 16,
  },
  warningClose: {
    fontSize: 18,
    color: '#856404',
    paddingHorizontal: 8,
  },
});
