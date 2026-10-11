function openFolder() {
    let rawPath = getCurrentPath() + '/' + this.getAttribute('data-id') + '/';
    let path = rawPath.replace(/\/+/g, '/');
    const auth = getFolderAuthFromPath();
    if (auth) {
        path = path + '&auth=' + auth;
    }
    window.location.href = `/?path=${path}`;
}

function openFile() {
    const fileName = (this.getAttribute('data-name') || '').toLowerCase();
    const rawPath = this.getAttribute('data-path') || '';
    const id = this.getAttribute('data-id') || '';
    const fullPath = ('/' + rawPath.replace(/^\/+|\/+$/g, '') + '/' + id).replace(/\/+/g, '/');
    
    const isVideoOrAudio = fileName.endsWith('.mp4') || fileName.endsWith('.mkv') || 
                           fileName.endsWith('.webm') || fileName.endsWith('.mov') || 
                           fileName.endsWith('.avi') || fileName.endsWith('.ts') || 
                           fileName.endsWith('.ogv') || fileName.endsWith('.mp3') || 
                           fileName.endsWith('.m4a') || fileName.endsWith('.wav') || 
                           fileName.endsWith('.ogg');

    let targetUrl;
    if (isVideoOrAudio) {
        targetUrl = '/stream?path=' + encodeURIComponent(fullPath);
    } else {
        targetUrl = '/file?path=' + encodeURIComponent(fullPath);
    }
    window.open(targetUrl, '_blank');
}

// File More Button Handler
function openMoreButton(div) {
    const id = div.getAttribute('data-id');
    const moreDiv = document.getElementById(`more-option-${id}`);
    const rect = div.getBoundingClientRect();
    const x = rect.left + window.scrollX - 40;
    const y = rect.top + window.scrollY;
    
    moreDiv.style.zIndex = 2;
    moreDiv.style.opacity = 1;
    moreDiv.style.left = `${x}px`;
    moreDiv.style.top = `${y}px`;
    
    const isTrash = getCurrentPath().includes('/trash');
    const focusEl = moreDiv.querySelector('.more-options-focus');
    if (focusEl) {
        focusEl.focus();
        focusEl.addEventListener('blur', closeMoreBtnFocus);
        focusEl.addEventListener('focusout', closeMoreBtnFocus);
    }

    if (!isTrash) {
        const renEl = moreDiv.querySelector(`#rename-${id}`);
        if (renEl) renEl.addEventListener('click', renameFileFolder);
        
        const trshEl = moreDiv.querySelector(`#trash-${id}`);
        if (trshEl) trshEl.addEventListener('click', trashFileFolder);
        
        const shrEl = moreDiv.querySelector(`#share-${id}`);
        if (shrEl) shrEl.addEventListener('click', shareFile);
        
        const fshrEl = moreDiv.querySelector(`#folder-share-${id}`);
        if (fshrEl) fshrEl.addEventListener('click', shareFolder);
    } else {
        const rstEl = moreDiv.querySelector(`#restore-${id}`);
        if (rstEl) rstEl.addEventListener('click', restoreFileFolder);
        
        const delEl = moreDiv.querySelector(`#delete-${id}`);
        if (delEl) delEl.addEventListener('click', deleteFileFolder);
    }
}

function closeMoreBtnFocus() {
    const moreDiv = this.parentElement;
    if (!moreDiv) return;
    moreDiv.style.opacity = '0';
    setTimeout(() => {
        moreDiv.style.zIndex = '-1';
    }, 300);
}

// Rename File/Folder
function renameFileFolder() {
    const id = this.getAttribute('id').split('-')[1];
    document.getElementById('rename-name').value = this.parentElement.getAttribute('data-name');
    document.getElementById('bg-blur').style.zIndex = '2';
    document.getElementById('bg-blur').style.opacity = '0.1';
    document.getElementById('rename-file-folder').style.zIndex = '3';
    document.getElementById('rename-file-folder').style.opacity = '1';
    document.getElementById('rename-file-folder').setAttribute('data-id', id);
    setTimeout(() => {
        document.getElementById('rename-name').focus();
    }, 300);
}

document.getElementById('rename-cancel').addEventListener('click', () => {
    document.getElementById('rename-name').value = '';
    document.getElementById('bg-blur').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('bg-blur').style.zIndex = '-1';
    }, 300);
    document.getElementById('rename-file-folder').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('rename-file-folder').style.zIndex = '-1';
    }, 300);
});

document.getElementById('rename-create').addEventListener('click', async () => {
    const name = document.getElementById('rename-name').value.trim();
    if (name === '') {
        alert('Name cannot be empty');
        return;
    }
    const id = document.getElementById('rename-file-folder').getAttribute('data-id');
    const rawPath = document.getElementById(`more-option-${id}`).getAttribute('data-path');
    const fullPath = ('/' + rawPath.replace(/^\/+|\/+$/g, '') + '/' + id).replace(/\/+/g, '/');
    
    const data = { 'name': name, 'path': fullPath };
    const response = await postJson('/api/renameFileFolder', data);
    if (response.status === 'ok') {
        alert('File/Folder renamed successfully');
        window.location.reload();
    } else {
        alert('Failed to rename file/folder: ' + (response.status || 'Unknown error'));
        window.location.reload();
    }
});

async function trashFileFolder() {
    const id = this.getAttribute('id').split('-')[1];
    const rawPath = document.getElementById(`more-option-${id}`).getAttribute('data-path');
    const fullPath = ('/' + rawPath.replace(/^\/+|\/+$/g, '') + '/' + id).replace(/\/+/g, '/');
    
    const data = { 'path': fullPath, 'trash': true };
    const response = await postJson('/api/trashFileFolder', data);
    if (response.status === 'ok') {
        alert('File/Folder moved to trash');
        window.location.reload();
    } else {
        alert('Failed to move item to trash');
        window.location.reload();
    }
}

async function restoreFileFolder() {
    const id = this.getAttribute('id').split('-')[1];
    const rawPath = this.getAttribute('data-path') || '';
    const fullPath = ('/' + rawPath.replace(/^\/+|\/+$/g, '') + '/' + id).replace(/\/+/g, '/');
    
    const data = { 'path': fullPath, 'trash': false };
    const response = await postJson('/api/trashFileFolder', data);
    if (response.status === 'ok') {
        alert('File/Folder restored successfully');
        window.location.reload();
    } else {
        alert('Failed to restore item');
        window.location.reload();
    }
}

async function deleteFileFolder() {
    const id = this.getAttribute('id').split('-')[1];
    const rawPath = this.getAttribute('data-path') || '';
    const fullPath = ('/' + rawPath.replace(/^\/+|\/+$/g, '') + '/' + id).replace(/\/+/g, '/');
    
    if (!confirm('Are you sure you want to permanently delete this item?')) {
        return;
    }
    const data = { 'path': fullPath };
    const response = await postJson('/api/deleteFileFolder', data);
    if (response.status === 'ok') {
        alert('File/Folder permanently deleted');
        window.location.reload();
    } else {
        alert('Failed to delete item');
        window.location.reload();
    }
}

async function shareFile() {
    const fileName = (this.parentElement.getAttribute('data-name') || '').toLowerCase();
    const id = this.getAttribute('id').split('-')[1];
    const moreOption = document.getElementById(`more-option-${id}`);
    const rawPath = moreOption ? moreOption.getAttribute('data-path') : '';
    const fullPath = ('/' + rawPath.replace(/^\/+|\/+$/g, '') + '/' + id).replace(/\/+/g, '/');
    
    const root_url = getRootUrl();
    const fileUrl = `${root_url}/file?path=${encodeURIComponent(fullPath)}`;
    
    const isVideoOrAudio = fileName.endsWith('.mp4') || fileName.endsWith('.mkv') || 
                           fileName.endsWith('.webm') || fileName.endsWith('.mov') || 
                           fileName.endsWith('.avi') || fileName.endsWith('.ts') || 
                           fileName.endsWith('.ogv') || fileName.endsWith('.mp3') || 
                           fileName.endsWith('.m4a') || fileName.endsWith('.wav') || 
                           fileName.endsWith('.ogg');

    let link;
    if (isVideoOrAudio) {
        link = `${root_url}/stream?path=${encodeURIComponent(fullPath)}`;
    } else {
        link = fileUrl;
    }
    copyTextToClipboard(link);
}

async function shareFolder() {
    const id = this.getAttribute('id').split('-')[2];
    const moreOption = document.getElementById(`more-option-${id}`);
    const rawPath = moreOption ? moreOption.getAttribute('data-path') : '';
    let fullPath = ('/' + rawPath.replace(/^\/+|\/+$/g, '') + '/' + id).replace(/\/+/g, '/');
    
    const root_url = getRootUrl();
    const auth = await getFolderShareAuth(fullPath);
    fullPath = fullPath.slice(1);
    const link = `${root_url}/?path=/share_${encodeURIComponent(fullPath)}&auth=${auth}`;
    copyTextToClipboard(link);
}
