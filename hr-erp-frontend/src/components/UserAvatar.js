import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';
import { getAvatarColor, getInitials } from '../utils/welcomeGreeting';
import { persistProfilePicture, useAuthenticatedAvatar } from '../utils/avatarHelpers';

const sizeMap = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 96
};

/**
 * Circular avatar with initials fallback and optional click-to-upload.
 */
const UserAvatar = ({
  user,
  name,
  profilePicture,
  size = 'lg',
  editable = false,
  onPictureUpdated
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const displayName = name || user?.name || '';
  const picturePath = profilePicture ?? user?.profilePicture ?? '';
  const imageSrc = useAuthenticatedAvatar(picturePath);
  const dimension = sizeMap[size] || sizeMap.lg;
  const initials = getInitials(displayName);
  const bgColor = getAvatarColor(displayName);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/users/upload-avatar`, {
        method: 'POST',
        headers: { 'x-auth-token': token },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || t('userAvatar.uploadFailed'));
      }
      persistProfilePicture(data.profilePicture);
      onPictureUpdated?.(data.profilePicture);
    } catch (err) {
      setUploadError(err.message || t('userAvatar.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const circleStyle = {
    width: dimension,
    height: dimension,
    borderRadius: '50%',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: imageSrc ? '#e8eaf6' : bgColor,
    color: '#fff',
    fontWeight: 700,
    fontSize: dimension * 0.34,
    letterSpacing: '0.02em',
    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
    border: '3px solid rgba(255,255,255,0.85)'
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={circleStyle}
        className={editable ? 'user-avatar-editable' : undefined}
        onClick={editable ? () => fileInputRef.current?.click() : undefined}
        onKeyDown={editable ? (ev) => ev.key === 'Enter' && fileInputRef.current?.click() : undefined}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={editable ? t('userAvatar.changePhoto') : undefined}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initials
        )}

        {editable && (
          <div
            className="user-avatar-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: uploading ? 1 : 0,
              transition: 'opacity 0.2s ease',
              cursor: uploading ? 'wait' : 'pointer'
            }}
          >
            <span style={{ fontSize: dimension * 0.28 }}>{uploading ? '⏳' : '📷'}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {uploadError && (
        <span style={{ color: '#ffcdd2', fontSize: '0.75rem', marginTop: '0.35rem', maxWidth: dimension + 40, textAlign: 'center' }}>
          {uploadError}
        </span>
      )}

      <style>{`
        .user-avatar-editable:hover .user-avatar-overlay,
        .user-avatar-editable:focus .user-avatar-overlay {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default UserAvatar;
