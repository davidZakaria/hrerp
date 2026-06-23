import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';
import { getAvatarColor, getInitials } from '../utils/welcomeGreeting';
import { persistProfilePicture, useAuthenticatedAvatar } from '../utils/avatarHelpers';

const sizeMap = {
  xs: 32,
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
  compact = false,
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

  const sizeClass = compact ? 'user-avatar--compact' : `user-avatar--${size}`;

  return (
    <div className="user-avatar-wrap">
      <div
        className={`user-avatar ${sizeClass}${editable ? ' user-avatar-editable' : ''}`}
        style={{
          background: imageSrc ? 'var(--theme-bg-subtle)' : bgColor,
          fontSize: dimension * 0.34
        }}
        onClick={editable ? () => fileInputRef.current?.click() : undefined}
        onKeyDown={editable ? (ev) => ev.key === 'Enter' && fileInputRef.current?.click() : undefined}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={editable ? t('userAvatar.changePhoto') : undefined}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={displayName ? `${displayName} profile` : ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initials
        )}

        {editable && (
          <div
            className={`user-avatar-overlay${uploading ? ' user-avatar-overlay--visible' : ''}`}
            style={{ fontSize: dimension * 0.28 }}
          >
            <span aria-hidden="true">{uploading ? '⏳' : '📷'}</span>
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
        <span className="user-avatar-error" style={{ maxWidth: dimension + 40 }}>
          {uploadError}
        </span>
      )}
    </div>
  );
};

export default UserAvatar;
