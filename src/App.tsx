/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Send, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Upload, 
  LogOut, 
  Edit3, 
  Trash2, 
  Share2, 
  Calendar, 
  DollarSign, 
  User, 
  Layers, 
  MapPin, 
  Briefcase, 
  AlertCircle,
  Menu,
  X,
  Check,
  FileSpreadsheet,
  LayoutDashboard,
  BarChart3,
  Settings,
  Bell,
  Eye,
  RefreshCcw,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Key,
  Lock,
  UserCheck,
  Users,
  Paperclip,
  ExternalLink,
  FileCheck
} from 'lucide-react';
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';
import Papa from 'papaparse';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  setDoc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import bannerImg from '../src/assets/images/corporate_mis_banner_1791135097531.jpg';

// Designated Admin Account with full administrative access
export const DESIGNATED_ADMIN_EMAIL = 'tarunkumarc1201@gmail.com';

// Expected Firebase Project ID
export const EXPECTED_PROJECT_ID = 'ss-innovative-mis';

export interface FirebaseConfigValidation {
  isValid: boolean;
  actualProjectId: string;
  expectedProjectId: string;
  errorMessage?: string;
}

export function validateFirebaseConfig(config: typeof firebaseConfig): FirebaseConfigValidation {
  const actualProjectId = config?.projectId || '';
  if (!actualProjectId) {
    return {
      isValid: false,
      actualProjectId: '(not specified)',
      expectedProjectId: EXPECTED_PROJECT_ID,
      errorMessage: `Missing projectId in firebase-applet-config.json. Expected "${EXPECTED_PROJECT_ID}".`
    };
  }
  if (actualProjectId !== EXPECTED_PROJECT_ID) {
    return {
      isValid: false,
      actualProjectId,
      expectedProjectId: EXPECTED_PROJECT_ID,
      errorMessage: `Configured Firebase project ID is "${actualProjectId}". Expected "${EXPECTED_PROJECT_ID}".`
    };
  }
  if (!config.apiKey || config.apiKey.trim() === '') {
    return {
      isValid: false,
      actualProjectId,
      expectedProjectId: EXPECTED_PROJECT_ID,
      errorMessage: `Missing or empty apiKey in firebase-applet-config.json.`
    };
  }
  return {
    isValid: true,
    actualProjectId,
    expectedProjectId: EXPECTED_PROJECT_ID
  };
}

const configValidation = validateFirebaseConfig(firebaseConfig);

// Explicitly initialize Firebase app using the provided firebase-applet-config.json
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId
});

// Explicitly instantiate Auth, Firestore, and Storage objects
const auth = getAuth(app);
const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
const storage = getStorage(app, firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined);
const googleProvider = new GoogleAuthProvider();

export interface MisRecord {
  id?: string;
  serialNumber: string;
  branch: string;
  date: string;
  accountNumber: string;
  customerName: string;
  takeoverBank: string;
  amount: number;
  type: string;
  status: 'Pending' | 'Submitted' | 'Completed';
  pddDate: string;
  bankPersonName: string;
  rpPerson: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  // Legal Report Attachment Metadata (PDF, DOC, DOCX)
  legalReportUrl?: string | null;
  legalReportPath?: string | null;
  legalReportName?: string | null;
  legalReportSize?: number | null;
  legalReportUploadedAt?: string | null;
  legalReportFileType?: string | null;
}

const SINGLE_BRANCH = 'Hitec City Rai Durg';

// Helper function to detect document format (PDF, DOC, DOCX)
export const getLegalReportFormat = (
  fileName?: string | null,
  fileType?: string | null
): 'pdf' | 'doc' | 'docx' | 'file' => {
  if (!fileName && !fileType) return 'file';
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();

  if (name.endsWith('.pdf') || type.includes('pdf')) return 'pdf';
  if (name.endsWith('.docx') || type.includes('wordprocessingml')) return 'docx';
  if (name.endsWith('.doc') || type.includes('msword')) return 'doc';
  return 'file';
};

const INITIAL_FORM_STATE: MisRecord = {
  serialNumber: 'SS-' + Math.floor(1000 + Math.random() * 9000),
  branch: SINGLE_BRANCH,
  date: new Date().toISOString().split('T')[0],
  accountNumber: '',
  customerName: '',
  takeoverBank: '',
  amount: 0,
  type: 'Home Loan',
  status: 'Pending',
  pddDate: '',
  bankPersonName: '',
  rpPerson: '',
  legalReportUrl: null,
  legalReportPath: null,
  legalReportName: null,
  legalReportSize: null,
  legalReportUploadedAt: null,
  legalReportFileType: null
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [configStatus, setConfigStatus] = useState<FirebaseConfigValidation>(configValidation);
  const [email, setEmail] = useState('tarunkumarc1201@gmail.com');
  const [password, setPassword] = useState('password123');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authHelpMessage, setAuthHelpMessage] = useState('');

  // Navigation state
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'new_entry' | 'entries' | 'bulk' | 'report' | 'pending' | 'submitted' | 'completed' | 'settings'
  >('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // MIS Data state
  const [records, setRecords] = useState<MisRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MisRecord | null>(null);
  const [formData, setFormData] = useState<MisRecord>(INITIAL_FORM_STATE);

  // Legal Report Attachment State (PDF, DOC, DOCX support for Admin upload / replace / delete)
  const [selectedLegalReportFile, setSelectedLegalReportFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>('');
  const [isUploadingLegalReport, setIsUploadingLegalReport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [removeAttachmentFlag, setRemoveAttachmentFlag] = useState(false);

  // Legal Report Document Preview / Viewer Modal state
  const [previewDocumentRecord, setPreviewDocumentRecord] = useState<MisRecord | null>(null);

  // Success message toast
  const [successMessage, setSuccessMessage] = useState('');

  // View Record Modal
  const [viewingRecord, setViewingRecord] = useState<MisRecord | null>(null);

  // Delete Confirmation Modal
  const [deletingRecord, setDeletingRecord] = useState<MisRecord | null>(null);

  // Monthly Report state
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Role-Based Access Control (RBAC) state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [adminUsersList, setAdminUsersList] = useState<{ id: string; email?: string; isDesignatedAdmin?: boolean; role?: string; updatedAt?: string }[]>([]);
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminActionStatus, setAdminActionStatus] = useState('');

  // Auth observer and project configuration verification
  useEffect(() => {
    // Explicitly confirm the projectId loaded into Firebase Auth matches ss-innovative-mis
    const activeAuthProjectId = auth.app.options.projectId;
    if (!activeAuthProjectId || activeAuthProjectId !== EXPECTED_PROJECT_ID) {
      console.error(`Firebase Auth project ID verification failed: expected "${EXPECTED_PROJECT_ID}", active is "${activeAuthProjectId}"`);
      setConfigStatus({
        isValid: false,
        actualProjectId: activeAuthProjectId || '(none)',
        expectedProjectId: EXPECTED_PROJECT_ID,
        errorMessage: `Project ID mismatch: active Auth instance is configured with "${activeAuthProjectId || 'undefined'}" instead of "${EXPECTED_PROJECT_ID}".`
      });
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Maintain and verify Role-Based Access Control (RBAC)
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminChecked(true);
      setAdminUsersList([]);
      return;
    }

    setAdminChecked(false);

    // Designated admin email check (case-insensitive)
    const isDesignatedAdmin = Boolean(
      user.email && 
      user.email.toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase()
    );

    if (isDesignatedAdmin) {
      setIsAdmin(true);
      setAdminChecked(true);
      // Ensure the designated admin's UID document exists in the admins collection
      const adminDocRef = doc(db, 'admins', user.uid);
      setDoc(adminDocRef, {
        uid: user.uid,
        email: user.email,
        role: 'admin',
        isDesignatedAdmin: true,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err) => {
        console.log('Designated admin doc sync:', err);
      });
    }

    // Real-time listener for current user's admin document in Firestore
    const unsubscribeAdminDoc = onSnapshot(doc(db, 'admins', user.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.role === 'admin') {
        setIsAdmin(true);
      } else if (!isDesignatedAdmin) {
        setIsAdmin(false);
      }
      setAdminChecked(true);
    }, (err) => {
      console.log('Admin verification note:', err);
      if (!isDesignatedAdmin) {
        setIsAdmin(false);
      }
      setAdminChecked(true);
    });

    return () => unsubscribeAdminDoc();
  }, [user]);

  // If user is Admin, listen to all admin records for the User Management panel in Settings
  useEffect(() => {
    if (!user || !isAdmin) {
      setAdminUsersList([]);
      return;
    }

    const unsubscribeAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setAdminUsersList(list);
    }, (err) => {
      console.log('Fetch admins collection note:', err);
    });

    return () => unsubscribeAdmins();
  }, [user, isAdmin]);

  // Route security guard: Redirect regular users away from admin-only pages
  useEffect(() => {
    if (adminChecked && !isAdmin) {
      if (['bulk', 'settings', 'new_entry'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [isAdmin, adminChecked, activeTab]);

  // Fetch records from Firestore
  useEffect(() => {
    if (!user) {
      setRecords([]);
      setLoadingRecords(false);
      return;
    }

    try {
      const q = query(collection(db, 'mis_records'), orderBy('date', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: MisRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          list.push({ 
            id: docSnap.id, 
            serialNumber: data.serialNumber || data.serialNo || 'SS-1000',
            branch: SINGLE_BRANCH,
            date: data.date || new Date().toISOString().split('T')[0],
            accountNumber: data.accountNumber || data.fileAcNo || data.fileNumber || '',
            customerName: data.customerName || '',
            takeoverBank: data.takeoverBank || '',
            amount: Number(data.amount) || 0,
            type: data.type || 'Home Loan',
            status: data.status || 'Pending',
            pddDate: data.pddDate || '',
            bankPersonName: data.bankPersonName || data.bankPerson || '',
            rpPerson: data.rpPerson || '',
            userId: data.userId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            legalReportUrl: data.legalReportUrl || null,
            legalReportPath: data.legalReportPath || null,
            legalReportName: data.legalReportName || null,
            legalReportSize: data.legalReportSize || null,
            legalReportUploadedAt: data.legalReportUploadedAt || null
          });
        });
        setRecords(list);
        setLoadingRecords(false);
      }, (error) => {
        console.error('Firestore snapshot error:', error);
        setLoadingRecords(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('Error setting up snapshot:', e);
      setLoadingRecords(false);
    }
  }, [user]);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthHelpMessage('');

    // Pre-flight check: ensure project configuration is valid
    if (!configStatus.isValid) {
      setAuthError(configStatus.errorMessage || 'Invalid Firebase configuration.');
      setAuthHelpMessage(`App is configured for project "${configStatus.actualProjectId}", but requires "${EXPECTED_PROJECT_ID}". Please check firebase-applet-config.json.`);
      return;
    }

    const cleanEmail = email.trim();

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err: any) {
      const code = err?.code || '';
      const message = err?.message || '';
      console.error('[Firebase Auth Error Details]', {
        code,
        message,
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain,
        appId: auth.app.options.appId,
        fullError: err
      });

      // Configuration-related errors with clear, actionable steps
      if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid') {
        setAuthError('Configuration Error: Invalid Firebase API Key.');
        setAuthHelpMessage('The Web API Key in firebase-applet-config.json is invalid. Please verify your Project Settings in Firebase Console for project "ss-innovative-mis".');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError('Configuration Error: Unauthorized Domain.');
        setAuthHelpMessage(`The current hostname (${window.location.hostname}) is not in the Firebase Authorized Domains list. Add it under Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (code === 'auth/configuration-not-found' || code === 'auth/project-not-found') {
        setAuthError('Configuration Error: Firebase project not found.');
        setAuthHelpMessage('Could not connect to Firebase Authentication for project "ss-innovative-mis". Please check firebase-applet-config.json.');
      } else if (code === 'auth/operation-not-allowed' || message.includes('auth/operation-not-allowed')) {
        // Strictly only show when Firebase returns operation-not-allowed
        setAuthError('Email/Password provider is disabled in Firebase Console (ss-innovative-mis).');
        setAuthHelpMessage('Firebase returned [auth/operation-not-allowed]. In the Firebase Console for project ss-innovative-mis, open Authentication > Sign-in method, click Email/Password, turn the Enable switch on and click Save. (If recently enabled, please wait 1-2 minutes for Google changes to propagate, or use "Sign in with Google" below).');
      } else if (
        code === 'auth/invalid-credential' || 
        code === 'auth/wrong-password' || 
        code === 'auth/user-not-found' ||
        message.includes('auth/invalid-credential') ||
        message.includes('auth/wrong-password') ||
        message.includes('auth/user-not-found')
      ) {
        setAuthError('Invalid email or password.');
        setAuthHelpMessage('If you have not registered this email yet in project ss-innovative-mis, click "Create Account" below to register, or use Google Sign-In.');
      } else if (code === 'auth/email-already-in-use' || message.includes('auth/email-already-in-use')) {
        setAuthError('This email is already registered. Please sign in instead.');
      } else if (code === 'auth/weak-password' || message.includes('auth/weak-password')) {
        setAuthError('Password is too weak. Please use at least 6 characters.');
      } else if (code === 'auth/invalid-email' || message.includes('auth/invalid-email')) {
        setAuthError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests' || message.includes('auth/too-many-requests')) {
        setAuthError('Too many failed login attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed' || message.includes('auth/network-request-failed')) {
        setAuthError('Network error. Unable to reach Firebase backend.');
        setAuthHelpMessage('Please check your internet connection or firewall settings.');
      } else {
        const cleanMsg = message.replace(/^Firebase:\s*(?:Error\s*)?(?:\([^)]+\)\.?\s*)?/i, '').trim();
        setAuthError(cleanMsg || message || 'Authentication failed. Please verify your credentials.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthHelpMessage('');

    if (!configStatus.isValid) {
      setAuthError(configStatus.errorMessage || 'Invalid Firebase configuration.');
      setAuthHelpMessage(`App is configured for project "${configStatus.actualProjectId}", but requires "${EXPECTED_PROJECT_ID}". Please check firebase-applet-config.json.`);
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      const message = err?.message || 'Google Sign-In failed.';
      console.error('[Firebase Auth Google Error Details]', {
        code,
        message,
        projectId: auth.app.options.projectId,
        fullError: err
      });
      if (code === 'auth/operation-not-allowed' || message.includes('auth/operation-not-allowed')) {
        setAuthError('Google authentication is disabled in your Firebase Console.');
        setAuthHelpMessage('Please enable Google under Authentication -> Sign-in method in your Firebase console for project ss-innovative-mis.');
      } else if (code === 'auth/unauthorized-domain' || message.includes('auth/unauthorized-domain')) {
        setAuthError('Configuration Error: Unauthorized domain for Google sign-in.');
        setAuthHelpMessage(`The current hostname (${window.location.hostname}) must be added to Authorized Domains in Firebase Console > Authentication > Settings for project "ss-innovative-mis".`);
      } else if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
        setAuthError('Sign-in popup was closed before completion.');
      } else if (code === 'auth/network-request-failed' || message.includes('auth/network-request-failed')) {
        setAuthError('Network error. Unable to connect to Google authentication.');
      } else {
        const cleanMsg = message.replace(/^Firebase:\s*(?:Error\s*)?(?:\([^)]+\)\.?\s*)?/i, '').trim();
        setAuthError(cleanMsg || message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Management Handlers
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setAdminActionStatus('Error: Only administrators can manage roles.');
      return;
    }
    if (!newAdminUid.trim()) {
      setAdminActionStatus('Error: User UID is required.');
      return;
    }
    try {
      await setDoc(doc(db, 'admins', newAdminUid.trim()), {
        uid: newAdminUid.trim(),
        email: newAdminEmail.trim() || 'user@example.com',
        role: 'admin',
        isDesignatedAdmin: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast(`Admin privileges granted to UID: ${newAdminUid.trim()}`);
      setAdminActionStatus(`Successfully added admin: ${newAdminEmail || newAdminUid}`);
      setNewAdminUid('');
      setNewAdminEmail('');
      setTimeout(() => setAdminActionStatus(''), 4000);
    } catch (err: any) {
      setAdminActionStatus(`Error: ${err?.message || String(err)}`);
    }
  };

  const handleRevokeAdmin = async (adminId: string, adminEmail?: string) => {
    if (!isAdmin) return;
    if (adminEmail && adminEmail.toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase()) {
      alert('The designated root administrator cannot be revoked.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'admins', adminId));
      showToast('Admin privilege revoked.');
    } catch (err: any) {
      alert('Error revoking admin: ' + err.message);
    }
  };

  // Format file size nicely
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Legal Report Document File Selection and Client-Side Validation (.pdf, .doc, .docx)
  const handleLegalReportFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    const isPdf = fileNameLower.endsWith('.pdf') || file.type === 'application/pdf';
    const isDoc = fileNameLower.endsWith('.doc') || file.type === 'application/msword' || file.type === 'application/x-msword';
    const isDocx = fileNameLower.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDoc && !isDocx) {
      setFileError('Invalid file format: Only PDF documents (.pdf) and Word documents (.doc, .docx) are permitted.');
      e.target.value = '';
      return;
    }

    // Limit to 10MB
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE_BYTES) {
      setFileError(`File size exceeds 10MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a file under 10MB.`);
      e.target.value = '';
      return;
    }

    setSelectedLegalReportFile(file);
    setRemoveAttachmentFlag(false);
  };

  // Backward compatible alias
  const handlePdfFileSelection = handleLegalReportFileSelection;

  // CRUD Operations with RBAC Enforcement & Firebase Storage Legal Report Integration
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Security Alert: Access denied. Only authorized administrators can create or edit MIS records.');
      return;
    }

    setFileError('');

    try {
      let legalReportUrl = formData.legalReportUrl || null;
      let legalReportPath = formData.legalReportPath || null;
      let legalReportName = formData.legalReportName || null;
      let legalReportSize = formData.legalReportSize || null;
      let legalReportUploadedAt = formData.legalReportUploadedAt || null;
      let legalReportFileType = formData.legalReportFileType || null;

      // Handle attachment removal request by Admin
      if (removeAttachmentFlag) {
        if (editingRecord?.legalReportPath) {
          try {
            const oldStorageRef = ref(storage, editingRecord.legalReportPath);
            await deleteObject(oldStorageRef);
          } catch (storageDelErr) {
            console.log('Previous file cleanup notice:', storageDelErr);
          }
        }
        legalReportUrl = null;
        legalReportPath = null;
        legalReportName = null;
        legalReportSize = null;
        legalReportUploadedAt = null;
        legalReportFileType = null;
      }

      // Handle new PDF / Word Document upload to Firebase Storage
      if (selectedLegalReportFile) {
        setIsUploadingLegalReport(true);
        setUploadProgress(0);

        const fileExt = selectedLegalReportFile.name.split('.').pop()?.toLowerCase() || '';
        let resolvedContentType = selectedLegalReportFile.type;
        if (fileExt === 'pdf') {
          resolvedContentType = 'application/pdf';
        } else if (fileExt === 'docx') {
          resolvedContentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (fileExt === 'doc') {
          resolvedContentType = 'application/msword';
        } else if (!resolvedContentType) {
          resolvedContentType = 'application/octet-stream';
        }

        const safeFileName = selectedLegalReportFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `legal_reports/${Date.now()}_${safeFileName}`;
        const fileRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(fileRef, selectedLegalReportFile, {
          contentType: resolvedContentType,
          customMetadata: {
            serialNumber: formData.serialNumber,
            accountNumber: formData.accountNumber,
            fileType: fileExt,
            uploadedBy: user?.email || 'admin'
          }
        });

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              if (snapshot.totalBytes > 0) {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setUploadProgress(progress);
              }
            },
            (error) => {
              console.error('Storage upload task error:', error);
              reject(error);
            },
            async () => {
              try {
                legalReportUrl = await getDownloadURL(uploadTask.snapshot.ref);
                legalReportPath = storagePath;
                legalReportName = selectedLegalReportFile.name;
                legalReportSize = selectedLegalReportFile.size;
                legalReportUploadedAt = new Date().toISOString();
                legalReportFileType = fileExt;
                resolve();
              } catch (urlErr) {
                reject(urlErr);
              }
            }
          );
        });

        // If replacing an existing legal report attachment, delete the old file from storage
        if (editingRecord?.legalReportPath && editingRecord.legalReportPath !== storagePath) {
          try {
            const oldStorageRef = ref(storage, editingRecord.legalReportPath);
            await deleteObject(oldStorageRef);
          } catch (delErr) {
            console.log('Old attachment cleanup notice:', delErr);
          }
        }
      }

      const recordData = {
        serialNumber: formData.serialNumber,
        branch: SINGLE_BRANCH,
        date: formData.date,
        accountNumber: formData.accountNumber,
        customerName: formData.customerName,
        takeoverBank: formData.takeoverBank,
        amount: Number(formData.amount) || 0,
        type: formData.type,
        status: formData.status,
        pddDate: formData.pddDate,
        bankPersonName: formData.bankPersonName,
        rpPerson: formData.rpPerson,
        userId: user?.uid || 'demo-user',
        updatedAt: new Date().toISOString(),
        legalReportUrl,
        legalReportPath,
        legalReportName,
        legalReportSize,
        legalReportUploadedAt,
        legalReportFileType
      };

      if (editingRecord?.id) {
        await updateDoc(doc(db, 'mis_records', editingRecord.id), recordData);
        showToast('Entry and Legal Report updated successfully.');
      } else {
        await addDoc(collection(db, 'mis_records'), {
          ...recordData,
          createdAt: new Date().toISOString()
        });
        showToast('New entry and Legal Report saved successfully.');
      }

      setShowFormModal(false);
      setEditingRecord(null);
      setFormData(INITIAL_FORM_STATE);
      setSelectedLegalReportFile(null);
      setRemoveAttachmentFlag(false);
      setIsUploadingLegalReport(false);
      setUploadProgress(0);
      setActiveTab('entries');
    } catch (err: any) {
      setIsUploadingLegalReport(false);
      console.error('Save record error:', err);
      if (err?.code === 'permission-denied') {
        alert('Security Enforcement: Write permission denied by Firestore database rules.');
      } else if (err?.code === 'storage/unauthorized') {
        alert('Security Enforcement: Storage write permission denied. Only administrators can upload legal reports.');
      } else {
        alert('Error saving record: ' + (err.message || String(err)));
      }
    }
  };

  const executeDelete = async () => {
    if (!deletingRecord?.id) return;
    if (!isAdmin) {
      alert('Security Alert: Access denied. Only authorized administrators can delete MIS records.');
      return;
    }

    try {
      // Clean up associated Legal Report attachment in Firebase Storage if present
      if (deletingRecord.legalReportPath) {
        try {
          const fileRef = ref(storage, deletingRecord.legalReportPath);
          await deleteObject(fileRef);
        } catch (storageDelErr) {
          console.log('Storage attachment cleanup notice:', storageDelErr);
        }
      }

      await deleteDoc(doc(db, 'mis_records', deletingRecord.id));
      showToast('Entry deleted successfully.');
      setDeletingRecord(null);
    } catch (err: any) {
      console.error('Firestore delete error details:', err);
      if (err?.code === 'permission-denied') {
        alert('Security Enforcement: Delete permission denied by Firestore database rules.');
      } else {
        alert('Failed to delete entry: ' + (err.message || String(err)));
      }
    }
  };

  const openAddModal = () => {
    if (!isAdmin) {
      alert('Security Alert: Only administrators can create new records.');
      return;
    }
    setEditingRecord(null);
    setSelectedLegalReportFile(null);
    setFileError('');
    setRemoveAttachmentFlag(false);
    setIsUploadingLegalReport(false);
    setUploadProgress(0);
    setFormData({
      serialNumber: 'SS-' + Math.floor(1000 + Math.random() * 9000),
      branch: SINGLE_BRANCH,
      date: new Date().toISOString().split('T')[0],
      accountNumber: '',
      customerName: '',
      takeoverBank: '',
      amount: 0,
      type: 'Home Loan',
      status: 'Pending',
      pddDate: '',
      bankPersonName: '',
      rpPerson: '',
      legalReportUrl: null,
      legalReportPath: null,
      legalReportName: null,
      legalReportSize: null,
      legalReportUploadedAt: null,
      legalReportFileType: null
    });
    setShowFormModal(true);
  };

  const openEditModal = (rec: MisRecord) => {
    if (!isAdmin) {
      alert('Security Alert: Only administrators can edit records.');
      return;
    }
    setEditingRecord(rec);
    setSelectedLegalReportFile(null);
    setFileError('');
    setRemoveAttachmentFlag(false);
    setIsUploadingLegalReport(false);
    setUploadProgress(0);
    setFormData({
      serialNumber: rec.serialNumber || '',
      branch: SINGLE_BRANCH,
      date: rec.date || new Date().toISOString().split('T')[0],
      accountNumber: rec.accountNumber || '',
      customerName: rec.customerName || '',
      takeoverBank: rec.takeoverBank || '',
      amount: Number(rec.amount) || 0,
      type: rec.type || 'Home Loan',
      status: rec.status || 'Pending',
      pddDate: rec.pddDate || '',
      bankPersonName: rec.bankPersonName || '',
      rpPerson: rec.rpPerson || '',
      legalReportUrl: rec.legalReportUrl || null,
      legalReportPath: rec.legalReportPath || null,
      legalReportName: rec.legalReportName || null,
      legalReportSize: rec.legalReportSize || null,
      legalReportUploadedAt: rec.legalReportUploadedAt || null,
      legalReportFileType: rec.legalReportFileType || null
    });
    setShowFormModal(true);
  };

  const shareToWhatsApp = (rec: MisRecord) => {
    const text = `*SS INNOVATIVES MIS - File Details*%0A` +
      `Serial: ${rec.serialNumber}%0A` +
      `Branch: ${SINGLE_BRANCH}%0A` +
      `Date: ${rec.date}%0A` +
      `A/C No: ${rec.accountNumber}%0A` +
      `Customer: ${rec.customerName}%0A` +
      `Takeover Bank: ${rec.takeoverBank || 'N/A'}%0A` +
      `Amount: ₹ ${Number(rec.amount).toLocaleString('en-IN')}%0A` +
      `Type: ${rec.type}%0A` +
      `Status: ${rec.status}%0A` +
      `PDD Date: ${rec.pddDate || 'N/A'}%0A` +
      `Bank Person: ${rec.bankPersonName || 'N/A'}%0A` +
      `R&P Person: ${rec.rpPerson || 'N/A'}`;
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Bulk File Upload (CSV/Excel) - Admin Only
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      alert('Security Alert: Bulk import is restricted to administrators.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          let importedCount = 0;
          for (const row of rows) {
            await addDoc(collection(db, 'mis_records'), {
              serialNumber: row.serialNumber || row.SerialNo || ('SS-' + Math.floor(1000 + Math.random() * 9000)),
              branch: SINGLE_BRANCH,
              date: row.date || row.Date || new Date().toISOString().split('T')[0],
              accountNumber: row.accountNumber || row.AccountNumber || row.fileNumber || '',
              customerName: row.customerName || row.CustomerName || '',
              takeoverBank: row.takeoverBank || row.TakeoverBank || '',
              amount: Number(row.amount || row.Amount || 0),
              type: row.type || row.Type || 'Home Loan',
              status: ['Pending', 'Submitted', 'Completed'].includes(row.status) ? row.status : 'Pending',
              pddDate: row.pddDate || row.PddDate || '',
              bankPersonName: row.bankPersonName || row.BankPerson || '',
              rpPerson: row.rpPerson || row.RpPerson || '',
              userId: user?.uid || 'demo-user',
              createdAt: new Date().toISOString()
            });
            importedCount++;
          }
          showToast(`Successfully imported ${importedCount} records.`);
          setActiveTab('entries');
        } catch (err: any) {
          console.error('Import error:', err);
          if (err?.code === 'permission-denied') {
            alert('Security Enforcement: Bulk upload permission denied by Firestore database rules.');
          } else {
            alert('Error importing file: ' + err.message);
          }
        }
      },
      error: (err) => {
        alert('CSV Parse Error: ' + err.message);
      }
    });
  };

  // Download CSV - Admin Only
  const downloadCSV = () => {
    if (!isAdmin) {
      alert('Security Alert: Data export is restricted to administrators.');
      return;
    }

    const csvData = records.map(r => ({
      'Serial Number': r.serialNumber,
      'Branch': SINGLE_BRANCH,
      'Date': r.date,
      'Account Number': r.accountNumber,
      'Customer Name': r.customerName,
      'Takeover Bank': r.takeoverBank,
      'Amount': r.amount,
      'Type': r.type,
      'Status': r.status,
      'PDD Date': r.pddDate,
      'Bank Person Name': r.bankPersonName,
      'R&P Person': r.rpPerson,
      'Legal Report Attachment': r.legalReportUrl ? (r.legalReportName || 'Attached') : 'None',
      'Legal Report URL': r.legalReportUrl || ''
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ss_innovative_mis_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    if (!isAdmin) {
      alert('Security Alert: Report printing/downloading is restricted to administrators.');
      return;
    }
    try {
      const printWindow = window.open('', '_blank');
      const rowsHtml = monthlyStats.monthRecs.map(rec => `
        <tr>
          <td>${rec.serialNumber || ''}</td>
          <td>${SINGLE_BRANCH}</td>
          <td>${rec.date || ''}</td>
          <td>${rec.accountNumber || ''}</td>
          <td>${rec.customerName || ''}</td>
          <td>${rec.takeoverBank || '—'}</td>
          <td>₹ ${Number(rec.amount || 0).toLocaleString('en-IN')}</td>
          <td>${rec.type || ''}</td>
          <td>${rec.status || ''}</td>
          <td>${rec.pddDate || '—'}</td>
          <td>${rec.bankPersonName || '—'}</td>
          <td>${rec.rpPerson || '—'}</td>
          <td>${rec.legalReportUrl ? 'Attached (PDF)' : '—'}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>SS INNOVATIVES MIS Report - ${reportMonth}</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
              body {
                font-family: Arial, sans-serif;
                color: #0f172a;
                background: #ffffff;
                margin: 0;
                padding: 20px;
                font-size: 11pt;
              }
              .header {
                border-bottom: 2px solid #0f172a;
                padding-bottom: 12px;
                margin-bottom: 20px;
              }
              h1 {
                margin: 0;
                font-size: 22px;
                font-weight: bold;
              }
              p {
                margin: 4px 0;
                font-size: 13px;
                color: #475569;
              }
              .stats-grid {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
              }
              .stat-card {
                background: #f8fafc;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 10px 15px;
                flex: 1;
              }
              .stat-label {
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                color: #64748b;
              }
              .stat-value {
                font-size: 18px;
                font-weight: bold;
                color: #0f172a;
                margin-top: 4px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              th, td {
                border: 1px solid #94a3b8;
                padding: 8px 10px;
                font-size: 10pt;
                text-align: left;
              }
              th {
                background-color: #f1f5f9;
                font-weight: bold;
                color: #1e293b;
              }
              tr:nth-child(even) {
                background-color: #f8fafc;
              }
              .print-btn-container {
                margin-top: 20px;
                text-align: center;
              }
              .print-btn {
                background: #2563eb;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 14px;
                font-weight: bold;
                border-radius: 6px;
                cursor: pointer;
              }
              @media print {
                .print-btn-container {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SS INNOVATIVES MIS</h1>
              <p>Management Information System Report</p>
              <p>Branch: <strong>${SINGLE_BRANCH}</strong> | Report Month: <strong>${reportMonth}</strong></p>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Files</div>
                <div class="stat-value">${monthlyStats.total} (₹ ${monthlyStats.totalAmount.toLocaleString('en-IN')})</div>
              </div>
              <div class="stat-card" style="border-color: #fcd34d; background: #fffbeb;">
                <div class="stat-label" style="color: #b45309;">Pending</div>
                <div class="stat-value" style="color: #d97706;">${monthlyStats.pending}</div>
              </div>
              <div class="stat-card" style="border-color: #93c5fd; background: #eff6ff;">
                <div class="stat-label" style="color: #1d4ed8;">Submitted</div>
                <div class="stat-value" style="color: #2563eb;">${monthlyStats.submitted}</div>
              </div>
              <div class="stat-card" style="border-color: #6ee7b7; background: #ecfdf5;">
                <div class="stat-label" style="color: #047857;">Completed</div>
                <div class="stat-value" style="color: #059669;">${monthlyStats.completed}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Branch</th>
                  <th>Date</th>
                  <th>Account Number</th>
                  <th>Customer Name</th>
                  <th>Takeover Bank</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>PDD Date</th>
                  <th>Bank Person Name</th>
                  <th>R&P Person</th>
                  <th>Legal Report</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="13" style="text-align: center; color: #64748b;">No records found for selected month.</td></tr>'}
              </tbody>
            </table>

            <div class="print-btn-container">
              <button class="print-btn" onclick="window.print()">Print Report</button>
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `;

      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const fallbackWin = window.open(url, '_blank');
        if (fallbackWin) {
          fallbackWin.focus();
          setTimeout(() => fallbackWin.print(), 500);
        }
      }
    } catch (err) {
      console.error('Print window error:', err);
      alert('Could not open print window. Please check popup blockers.');
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    let list = records;
    if (activeTab === 'pending') list = records.filter(r => r.status === 'Pending');
    if (activeTab === 'submitted') list = records.filter(r => r.status === 'Submitted');
    if (activeTab === 'completed') list = records.filter(r => r.status === 'Completed');

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.serialNumber?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.accountNumber?.toLowerCase().includes(q) ||
        r.takeoverBank?.toLowerCase().includes(q) ||
        r.bankPersonName?.toLowerCase().includes(q) ||
        r.rpPerson?.toLowerCase().includes(q) ||
        r.legalReportName?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const getNum = (str: string) => {
        const match = str?.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return getNum(a.serialNumber) - getNum(b.serialNumber);
    });
  }, [records, activeTab, searchTerm]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const total = records.length;
    const pending = records.filter(r => r.status === 'Pending').length;
    const submitted = records.filter(r => r.status === 'Submitted').length;
    const completed = records.filter(r => r.status === 'Completed').length;
    const totalAmount = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    return { total, pending, submitted, completed, totalAmount };
  }, [records]);

  // Monthly Report Stats
  const monthlyStats = useMemo(() => {
    const monthRecs = records.filter(r => r.date && r.date.startsWith(reportMonth)).sort((a, b) => {
      const getNum = (str: string) => {
        const match = str?.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return getNum(a.serialNumber) - getNum(b.serialNumber);
    });
    const total = monthRecs.length;
    const pending = monthRecs.filter(r => r.status === 'Pending').length;
    const submitted = monthRecs.filter(r => r.status === 'Submitted').length;
    const completed = monthRecs.filter(r => r.status === 'Completed').length;
    const totalAmount = monthRecs.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { monthRecs, total, pending, submitted, completed, totalAmount, completionPercentage };
  }, [records, reportMonth]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-medium">Loading SS Innovatives MIS...</p>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950 pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10 backdrop-blur-xl">
          <div className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-orange-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">SS INNOVATIVES MIS</h1>
            <p className="text-xs text-slate-400 font-medium">Management Information System Portal</p>
            
            {/* Project ID Verification Badge */}
            <div className="pt-1 flex items-center justify-center">
              <div className="inline-flex items-center gap-1.5 py-1 px-3 bg-slate-800/80 rounded-full border border-slate-700/60 text-[11px] text-slate-300">
                <span className={`w-2 h-2 rounded-full ${configStatus.isValid ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                <span>Project: <strong className="text-white font-mono">{configStatus.actualProjectId}</strong></span>
                {configStatus.isValid ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5 ml-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="text-red-400 font-semibold ml-1">(Mismatch)</span>
                )}
              </div>
            </div>

            {/* Role-Based Access Control Notice */}
            <div className="pt-2">
              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-left text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Role-Based Access Control (RBAC)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Designated Root Admin: <strong className="text-amber-300 font-mono">{DESIGNATED_ADMIN_EMAIL}</strong> (Full Management Access). Regular users have secure Read-Only access.
                </p>
              </div>
            </div>
          </div>

          {!configStatus.isValid && (
            <div className="mb-5 p-3.5 bg-amber-950/70 border border-amber-700 text-amber-200 text-xs rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Configuration Warning</span>
              </div>
              <p className="text-[11px] text-amber-300 leading-relaxed">
                {configStatus.errorMessage}
              </p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sign in with Google (Instant Access)</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold">Or Email / Password</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleEmailAuth}>
            {authError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
                {authHelpMessage && (
                  <p className="text-[11px] text-red-300 mt-1 pl-6 leading-relaxed">
                    {authHelpMessage}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="admin@ssinnovatives.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              {isSignUp ? 'Create Account & Login' : 'Sign In to Dashboard'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-orange-400 hover:underline font-medium cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // DASHBOARD & MAIN APP
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 relative">
      
      {/* Toast Notification Banner */}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-bold">{successMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden md:flex cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-orange-500 rounded-xl flex items-center justify-center text-white shadow">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-white block leading-tight">SS INNOVATIVES MIS</span>
                <span className="text-[10px] text-orange-400 font-medium tracking-wider uppercase">Management System</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Account No, Customer Name, Bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-800 text-white placeholder-slate-400 border border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>{SINGLE_BRANCH}</span>
            </div>

            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>

            <button className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl relative transition-colors cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            </button>

            <div className="flex items-center gap-3 pl-2 border-l border-slate-700">
              {isAdmin ? (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[11px] font-bold shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Admin</span>
                </div>
              ) : (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-[11px] font-medium">
                  <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Viewer (Read-Only)</span>
                </div>
              )}

              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow" title={`${user?.email} (${isAdmin ? 'Admin' : 'User'})`}>
                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-slate-300 hover:text-orange-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. LEFT SIDEBAR */}
        <aside className={`bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 flex flex-col z-30 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } hidden md:flex shrink-0`}>
          <div className="p-4 flex-1 space-y-1.5 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>{sidebarOpen ? 'Main Navigation' : 'Menu'}</span>
              {sidebarOpen && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${isAdmin ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-400'}`}>
                  {isAdmin ? 'ADMIN' : 'VIEWER'}
                </span>
              )}
            </div>

            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
              { id: 'new_entry', label: 'New Entry', icon: Plus, adminOnly: true },
              { id: 'entries', label: 'Data Entries', icon: FileText, adminOnly: false },
              { id: 'bulk', label: 'Bulk Import', icon: Upload, adminOnly: true },
              { id: 'report', label: 'Monthly Report', icon: BarChart3, adminOnly: false },
              { id: 'pending', label: 'Pending Files', icon: Clock, adminOnly: false },
              { id: 'submitted', label: 'Submitted Files', icon: Send, adminOnly: false },
              { id: 'completed', label: 'Completed Files', icon: CheckCircle2, adminOnly: false },
              { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
            ]
              .filter(item => !item.adminOnly || isAdmin)
              .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'entries' && activeTab === 'entries');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'new_entry') {
                      openAddModal();
                    } else {
                      setActiveTab(item.id as any);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20' 
                      : 'hover:bg-slate-800/80 hover:text-white text-slate-400'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}

            <div className="pt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {sidebarOpen ? 'Actions & Share' : 'Tools'}
            </div>

            {isAdmin && (
              <button
                onClick={downloadCSV}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800/85 hover:text-white text-slate-400 transition-all cursor-pointer"
                title="Print / Download CSV"
              >
                <Download className="w-4 h-4 shrink-0 text-slate-400" />
                {sidebarOpen && <span className="truncate">Export CSV</span>}
              </button>
            )}

            <button
              onClick={() => {
                if (records.length > 0) shareToWhatsApp(records[0]);
                else alert('No records available to share on WhatsApp.');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800/85 hover:text-white text-slate-400 transition-all cursor-pointer"
              title="WhatsApp Share"
            >
              <Share2 className="w-4 h-4 shrink-0 text-emerald-400" />
              {sidebarOpen && <span className="truncate">WhatsApp Share</span>}
            </button>
          </div>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-900/50 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="truncate">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Modal */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex md:hidden">
            <div className="w-72 bg-slate-900 text-white p-6 space-y-4 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-orange-500 rounded-xl flex items-center justify-center text-white">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold block">SS INNOVATIVES MIS</span>
                      <span className="text-[10px] text-amber-400 uppercase font-semibold">
                        {isAdmin ? 'Admin Mode' : 'Viewer Mode'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mt-4 space-y-1">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
                    { id: 'new_entry', label: 'New Entry', icon: Plus, adminOnly: true },
                    { id: 'entries', label: 'Data Entries', icon: FileText, adminOnly: false },
                    { id: 'bulk', label: 'Bulk Import', icon: Upload, adminOnly: true },
                    { id: 'report', label: 'Monthly Report', icon: BarChart3, adminOnly: false },
                    { id: 'pending', label: 'Pending Files', icon: Clock, adminOnly: false },
                    { id: 'submitted', label: 'Submitted Files', icon: Send, adminOnly: false },
                    { id: 'completed', label: 'Completed Files', icon: CheckCircle2, adminOnly: false },
                    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
                  ]
                    .filter(item => !item.adminOnly || isAdmin)
                    .map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'new_entry') {
                            openAddModal();
                          } else {
                            setActiveTab(item.id as any);
                          }
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                      >
                        <Icon className="w-4 h-4 text-orange-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* 3. DASHBOARD WELCOME BANNER */}
            {activeTab === 'dashboard' && (
              <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl shadow-xl text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
                <div className="absolute right-0 top-0 w-96 h-full opacity-20 pointer-events-none overflow-hidden rounded-r-2xl">
                  <img src={bannerImg} alt="Banner background" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2 relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Corporate MIS Portal v2.5
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome to SS Innovatives MIS</h2>
                  <p className="text-sm text-slate-300 max-w-xl">Track, Manage and Monitor All Your MIS Files in One Place with advanced real-time branch analytics and automated workflows.</p>
                </div>
                <div className="flex items-center gap-3 relative z-10 shrink-0">
                  {isAdmin ? (
                    <>
                      <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ New Entry</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('bulk')}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>Bulk Import</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 text-slate-300 rounded-xl border border-slate-700 text-xs font-medium">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span>Viewer Access (Read-Only)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. KPI CARDS */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between text-slate-500 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Files</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats.total}</div>
                    <p className="text-xs text-slate-500 mt-1 font-mono">₹ {stats.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between text-amber-600 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending</span>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-amber-600 tabular-nums">{stats.pending}</div>
                    <p className="text-xs text-slate-500 mt-1">Action required</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between text-blue-600 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Submitted</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-blue-600 tabular-nums">{stats.submitted}</div>
                    <p className="text-xs text-slate-500 mt-1">Under verification</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between text-emerald-600 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-emerald-600 tabular-nums">{stats.completed}</div>
                    <p className="text-xs text-slate-500 mt-1">Successfully closed</p>
                  </div>
                </div>

              </div>
            )}

            {/* 5. DONUT CHART: FILE STATUS DISTRIBUTION */}
            {activeTab === 'dashboard' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <span>Total File Status Distribution</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time status breakdown across all {stats.total} branch files</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pending: {stats.pending}
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Submitted: {stats.submitted}
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Completed: {stats.completed}
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {stats.total === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      No MIS files available to display distribution chart.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Pending', value: stats.pending, color: '#f59e0b' },
                            { name: 'Submitted', value: stats.submitted, color: '#2563eb' },
                            { name: 'Completed', value: stats.completed, color: '#10b981' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {[
                            { name: 'Pending', color: '#f59e0b' },
                            { name: 'Submitted', color: '#2563eb' },
                            { name: 'Completed', color: '#10b981' }
                          ].map((entry, index) => (
                            <Cell key={`donut-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(val: any) => [`${val} Files`, 'Count']}
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>} 
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT ROUTER */}
            {activeTab === 'report' ? (
              <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print-only-container">
                {/* Print Only Header */}
                <div className="hidden print:block pb-4 border-b border-slate-300 mb-4">
                  <h1 className="text-xl font-extrabold text-slate-900">SS INNOVATIVES MIS</h1>
                  <p className="text-xs font-semibold text-slate-600">Management Information System Report</p>
                  <p className="text-xs text-slate-700 mt-1">
                    Branch: <strong>{SINGLE_BRANCH}</strong> | Report Month: <strong>{reportMonth}</strong>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 no-print">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Monthly MIS Report & Analytics ({SINGLE_BRANCH})</h3>
                    <p className="text-xs text-slate-500">Summary statistics for selected month.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="month"
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-600"
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Print Report button clicked -> opening print window');
                          handlePrintReport();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer relative z-30 pointer-events-auto"
                      >
                        <Printer className="w-4 h-4 pointer-events-none" />
                        <span className="pointer-events-none">Print Report</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold uppercase text-slate-500">Total Files</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{monthlyStats.total}</div>
                    <p className="text-xs text-slate-400 mt-0.5">₹ {monthlyStats.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <span className="text-xs font-semibold uppercase text-amber-700">Pending</span>
                    <div className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{monthlyStats.pending}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <span className="text-xs font-semibold uppercase text-blue-700">Submitted</span>
                    <div className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{monthlyStats.submitted}</div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <span className="text-xs font-semibold uppercase text-emerald-700">Completed</span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">{monthlyStats.completed}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs font-semibold uppercase text-purple-700">Completion %</span>
                    <div className="text-2xl font-bold text-purple-600 mt-1 tabular-nums">{monthlyStats.completionPercentage}%</div>
                  </div>
                </div>

                <div className="overflow-x-auto pt-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <th className="py-3 px-4">Serial Number</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Account Number</th>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Takeover Bank</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">PDD Date</th>
                        <th className="py-3 px-4">Bank Person Name</th>
                        <th className="py-3 px-4">R&P Person</th>
                        <th className="py-3 px-4">Legal Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {monthlyStats.monthRecs.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{rec.serialNumber}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{SINGLE_BRANCH}</td>
                          <td className="py-3 px-4 text-slate-500">{rec.date}</td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">{rec.accountNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{rec.customerName}</td>
                          <td className="py-3 px-4">{rec.takeoverBank || '—'}</td>
                          <td className="py-3 px-4 font-mono font-medium">₹ {Number(rec.amount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4">{rec.type}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                              rec.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                              rec.status === 'Submitted' ? 'bg-blue-50 text-blue-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>{rec.status}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{rec.pddDate || '—'}</td>
                          <td className="py-3 px-4">{rec.bankPersonName || '—'}</td>
                          <td className="py-3 px-4">{rec.rpPerson || '—'}</td>
                          <td className="py-3 px-4">
                            {rec.legalReportUrl ? (() => {
                              const format = getLegalReportFormat(rec.legalReportName, rec.legalReportFileType);
                              const isWord = format === 'doc' || format === 'docx';
                              return (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDocumentRecord(rec)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer border ${
                                    isWord
                                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                                  }`}
                                  title={rec.legalReportName || `Legal Report ${format.toUpperCase()}`}
                                >
                                  <FileText className={`w-3 h-3 ${isWord ? 'text-blue-600' : 'text-rose-600'}`} />
                                  <span>{format.toUpperCase()}</span>
                                </button>
                              );
                            })() : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'bulk' ? (
              isAdmin ? (
                <div className="space-y-6 max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Bulk Data Import</h3>
                    <p className="text-xs text-slate-500 mt-1">Upload CSV or Excel file. All imported records will automatically be assigned to branch: <strong>{SINGLE_BRANCH}</strong>.</p>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Choose CSV / Excel File</span>
                    <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
                  <p className="text-xs text-slate-500">Bulk data import is strictly restricted to authorized administrators.</p>
                  <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
                    Back to Dashboard
                  </button>
                </div>
              )
            ) : activeTab === 'settings' ? (
              isAdmin ? (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Administrator & System Settings</h3>
                        <p className="text-xs text-slate-500">System parameters and Role-Based Access Control (RBAC)</p>
                      </div>
                      <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-500" /> Admin Console
                      </span>
                    </div>

                    <div className="space-y-4 text-xs text-slate-600">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">Assigned Branch</span>
                          <span className="text-blue-600 font-bold">{SINGLE_BRANCH}</span>
                        </div>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg text-[11px]">Locked (Single Branch)</span>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">Firebase Firestore Database</span>
                          <span className="text-slate-500 font-mono text-[11px]">Database ID: ai-studio-addf9896-e94f-4fa8-9e47-18b8b2b7b61d</span>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-[11px]">Connected</span>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">Active User Session</span>
                          <span className="text-slate-800 font-mono">{user?.email}</span>
                          <span className="text-[11px] text-amber-600 block mt-0.5 font-medium">Role: Administrator (Full Access)</span>
                        </div>
                        <button onClick={handleLogout} className="px-3 py-1.5 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 cursor-pointer">
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RBAC USER MANAGEMENT PANEL */}
                  <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span>Role-Based Access Control (RBAC) Management</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Designated Root Admin: <strong className="text-slate-800">{DESIGNATED_ADMIN_EMAIL}</strong>. Additional administrators can be granted access below.
                      </p>
                    </div>

                    {adminActionStatus && (
                      <div className={`p-3 rounded-xl text-xs font-medium border ${adminActionStatus.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {adminActionStatus}
                      </div>
                    )}

                    <form onSubmit={handleAddAdmin} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Grant Admin Rights to User</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">User UID *</label>
                          <input
                            type="text"
                            required
                            placeholder="Firebase User UID"
                            value={newAdminUid}
                            onChange={(e) => setNewAdminUid(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">User Email (Optional)</label>
                          <input
                            type="email"
                            placeholder="user@example.com"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Grant Admin Privileges</span>
                        </button>
                      </div>
                    </form>

                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">Authorized Admin Accounts</span>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <th className="py-2.5 px-3">UID / Identifier</th>
                              <th className="py-2.5 px-3">Email</th>
                              <th className="py-2.5 px-3">Role Tier</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {/* Designated Root Admin Row */}
                            <tr className="bg-amber-50/40">
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {user?.email?.toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase() ? user.uid : 'Designated Root'}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{DESIGNATED_ADMIN_EMAIL}</td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Root Admin
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="text-[11px] text-slate-400 font-medium">Permanent</span>
                              </td>
                            </tr>

                            {/* Additional Admins from Firestore */}
                            {adminUsersList.filter(a => a.email?.toLowerCase() !== DESIGNATED_ADMIN_EMAIL.toLowerCase()).map((adminItem) => (
                              <tr key={adminItem.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono text-slate-600">{adminItem.id}</td>
                                <td className="py-2.5 px-3 text-slate-900">{adminItem.email || '—'}</td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                    Admin
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleRevokeAdmin(adminItem.id, adminItem.email)}
                                    className="text-red-600 hover:text-red-800 font-semibold text-[11px] cursor-pointer"
                                  >
                                    Revoke
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
                  <p className="text-xs text-slate-500">System settings are restricted to authorized administrators.</p>
                  <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
                    Back to Dashboard
                  </button>
                </div>
              )
            ) : (
              /* EXACT 13-COLUMN MIS DATA TABLE WITH WORKING DELETE BUTTON */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 capitalize">
                      {activeTab === 'dashboard' ? 'MIS Entries' : `${activeTab} MIS Files`}
                    </h3>
                    <p className="text-xs text-slate-500">Branch: <strong>{SINGLE_BRANCH}</strong> · Showing {filteredRecords.length} records.</p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ New Entry</span>
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {filteredRecords.length === 0 ? (
                    <div className="p-16 text-center text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No MIS records found.</p>
                      {isAdmin && <p className="text-xs text-slate-400 mt-1">Click "+ New Entry" above to add your first record.</p>}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                            <th className="py-3.5 px-4">Serial Number</th>
                            <th className="py-3.5 px-4">Branch</th>
                            <th className="py-3.5 px-4">Date</th>
                            <th className="py-3.5 px-4">Account Number</th>
                            <th className="py-3.5 px-4">Customer Name</th>
                            <th className="py-3.5 px-4">Takeover Bank</th>
                            <th className="py-3.5 px-4">Amount</th>
                            <th className="py-3.5 px-4">Type</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4">PDD Date</th>
                            <th className="py-3.5 px-4">Bank Person Name</th>
                            <th className="py-3.5 px-4">R&P Person</th>
                            <th className="py-3.5 px-4">Legal Report</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700 whitespace-nowrap">
                          {filteredRecords.map((rec, idx) => (
                            <tr key={rec.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900">{rec.serialNumber || `SS-${idx + 1}`}</td>
                              <td className="py-3.5 px-4 font-bold text-blue-600">{SINGLE_BRANCH}</td>
                              <td className="py-3.5 px-4 text-slate-500 tabular-nums">{rec.date}</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{rec.accountNumber}</td>
                              <td className="py-3.5 px-4 font-semibold text-slate-900">{rec.customerName}</td>
                              <td className="py-3.5 px-4">{rec.takeoverBank || '—'}</td>
                              <td className="py-3.5 px-4 font-mono font-bold tabular-nums text-slate-900">₹ {Number(rec.amount || 0).toLocaleString('en-IN')}</td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">{rec.type}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                  rec.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  rec.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {rec.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-500">{rec.pddDate || '—'}</td>
                              <td className="py-3.5 px-4">{rec.bankPersonName || '—'}</td>
                              <td className="py-3.5 px-4">{rec.rpPerson || '—'}</td>
                              <td className="py-3.5 px-4">
                                {rec.legalReportUrl ? (() => {
                                  const format = getLegalReportFormat(rec.legalReportName, rec.legalReportFileType);
                                  const isWord = format === 'doc' || format === 'docx';
                                  const labelText = isWord ? `View ${format.toUpperCase()}` : 'View PDF';
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewDocumentRecord(rec);
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                          isWord
                                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                        }`}
                                        title={`View Legal Report (${rec.legalReportName || format.toUpperCase()})`}
                                      >
                                        <FileText className={`w-3.5 h-3.5 ${isWord ? 'text-blue-600' : 'text-rose-600'}`} />
                                        <span>{labelText}</span>
                                      </button>
                                      <a
                                        href={rec.legalReportUrl}
                                        download={rec.legalReportName || `Legal_Report_${rec.accountNumber}.${format}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title={`Download ${format.toUpperCase()}`}
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  );
                                })() : (
                                  <span className="text-slate-300 text-xs font-mono">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5 relative z-20">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingRecord(rec);
                                  }}
                                  title="View Details"
                                  className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 pointer-events-none" />
                                </button>
                                {rec.legalReportUrl && (() => {
                                  const format = getLegalReportFormat(rec.legalReportName, rec.legalReportFileType);
                                  const isWord = format === 'doc' || format === 'docx';
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewDocumentRecord(rec);
                                      }}
                                      title={`View / Download Legal Report (${format.toUpperCase()})`}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isWord
                                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                          : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                      }`}
                                    >
                                      <FileText className="w-3.5 h-3.5 pointer-events-none" />
                                    </button>
                                  );
                                })()}
                                {isAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(rec);
                                      }}
                                      title="Edit"
                                      className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 pointer-events-none" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('Delete button clicked for record:', rec);
                                        setDeletingRecord(rec);
                                      }}
                                      title="Delete"
                                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        shareToWhatsApp(rec);
                                      }}
                                      title="WhatsApp"
                                      className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Share2 className="w-3.5 h-3.5 pointer-events-none" />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BRANCH OVERVIEW SECTION ON DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 gap-6 pt-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span>Branch Files Overview ({SINGLE_BRANCH})</span>
                  </h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{SINGLE_BRANCH}</span>
                    <span className="font-mono font-bold text-blue-600 text-sm">{stats.total} Total Files</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* NEW / EDIT ENTRY FORM MODAL (EXACT 12 FIELDS) */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingRecord ? 'Edit MIS Record Entry' : 'New MIS Record Entry'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">1. Serial Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">2. Branch *</label>
                  <input
                    type="text"
                    disabled
                    value={SINGLE_BRANCH}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">3. Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">4. Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACC-99812"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">5. Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer full name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">6. Takeover Bank</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={formData.takeoverBank}
                    onChange={(e) => setFormData({ ...formData, takeoverBank: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">7. Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">8. Type</label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">9. Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-medium"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">10. PDD Date</label>
                  <input
                    type="date"
                    value={formData.pddDate}
                    onChange={(e) => setFormData({ ...formData, pddDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">11. Bank Person Name</label>
                  <input
                    type="text"
                    placeholder="Bank contact person"
                    value={formData.bankPersonName}
                    onChange={(e) => setFormData({ ...formData, bankPersonName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">12. R&P Person</label>
                  <input
                    type="text"
                    placeholder="R&P person name"
                    value={formData.rpPerson}
                    onChange={(e) => setFormData({ ...formData, rpPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

              </div>

              {/* 13. LEGAL REPORT ATTACHMENT (PDF, DOC, DOCX) */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>13. Legal Report Attachment</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">(PDF or Word doc/docx · max 10MB)</span>
                  </label>
                  {isAdmin && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold">
                      Admin Upload
                    </span>
                  )}
                </div>

                {/* Existing attachment viewer/actions (when editing) */}
                {formData.legalReportUrl && !removeAttachmentFlag && (() => {
                  const format = getLegalReportFormat(formData.legalReportName, formData.legalReportFileType);
                  const isWord = format === 'doc' || format === 'docx';
                  return (
                    <div className={`p-3.5 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isWord ? 'bg-blue-50/60 border-blue-200' : 'bg-rose-50/60 border-rose-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isWord ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 bg-white border text-[9px] font-bold uppercase rounded ${
                              isWord ? 'text-blue-700 border-blue-300' : 'text-rose-700 border-rose-300'
                            }`}>
                              {format.toUpperCase()}
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate max-w-xs" title={formData.legalReportName || `Legal_Report.${format}`}>
                              {formData.legalReportName || `Legal_Report.${format}`}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatFileSize(formData.legalReportSize)} {formData.legalReportUploadedAt ? `· Uploaded ${formData.legalReportUploadedAt.slice(0, 10)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDocumentRecord(formData)}
                          className={`px-2.5 py-1.5 bg-white border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isWord
                              ? 'border-blue-200 text-blue-700 hover:bg-blue-100'
                              : 'border-rose-200 text-rose-700 hover:bg-rose-100'
                          }`}
                          title={`View ${format.toUpperCase()}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <a
                          href={formData.legalReportUrl}
                          download={formData.legalReportName || `Legal_Report_${formData.accountNumber}.${format}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-2.5 py-1.5 bg-white border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isWord
                              ? 'border-blue-200 text-blue-700 hover:bg-blue-100'
                              : 'border-rose-200 text-rose-700 hover:bg-rose-100'
                          }`}
                          title={`Download ${format.toUpperCase()}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setRemoveAttachmentFlag(true)}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Remove existing attachment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* If marked for removal */}
                {removeAttachmentFlag && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Existing attachment will be removed permanently upon saving.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRemoveAttachmentFlag(false)}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-700 font-bold hover:bg-amber-100 transition-colors cursor-pointer text-xs"
                    >
                      Undo
                    </button>
                  </div>
                )}

                {/* File picker dropzone */}
                <div className="space-y-2">
                  <label
                    htmlFor="legal-report-file-picker"
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-800 block">
                        {formData.legalReportUrl && !removeAttachmentFlag
                          ? 'Click to select a new PDF or Word document to replace current report'
                          : 'Click to select Legal Report (PDF, Word .doc, .docx) from device'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Accepts .pdf, .doc, .docx files · Maximum size 10MB
                      </span>
                    </div>
                    <input
                      id="legal-report-file-picker"
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={isUploadingLegalReport}
                      onChange={handleLegalReportFileSelection}
                      className="hidden"
                    />
                  </label>

                  {/* Selected File indicator */}
                  {selectedLegalReportFile && (() => {
                    const format = getLegalReportFormat(selectedLegalReportFile.name, selectedLegalReportFile.type);
                    const isWord = format === 'doc' || format === 'docx';
                    return (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isWord ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {format.toUpperCase()}
                          </span>
                          <span className="font-bold text-slate-900 truncate" title={selectedLegalReportFile.name}>
                            {selectedLegalReportFile.name}
                          </span>
                          <span className="text-emerald-700 font-mono text-[11px] shrink-0">
                            ({formatFileSize(selectedLegalReportFile.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedLegalReportFile(null)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold p-1 cursor-pointer"
                          title="Cancel file selection"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })()}

                  {/* Validation Error Message */}
                  {fileError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}

                  {/* Upload Progress Bar */}
                  {isUploadingLegalReport && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <RefreshCcw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span>Uploading Legal Report to Firebase Storage...</span>
                        </span>
                        <span className="font-mono">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isUploadingLegalReport}
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingLegalReport}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploadingLegalReport ? (
                    <>
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving & Uploading ({uploadProgress}%)...</span>
                    </>
                  ) : (
                    <span>{editingRecord ? 'Update Entry' : 'Save Entry'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Delete Entry</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this entry? (Account No: <strong>{deletingRecord.accountNumber}</strong>, Customer: <strong>{deletingRecord.customerName}</strong>)
              {deletingRecord.legalReportUrl && (
                <span className="block mt-1 text-red-600 font-medium">
                  Note: The attached Legal Report PDF will also be removed from Firebase Storage.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW RECORD DETAILS MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Account Details: {viewingRecord.accountNumber}</h3>
              <button 
                type="button"
                onClick={() => setViewingRecord(null)} 
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-700 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div><span className="text-slate-400 block">Serial Number</span><strong className="text-slate-900">{viewingRecord.serialNumber}</strong></div>
                <div><span className="text-slate-400 block">Branch</span><strong className="text-blue-600">{SINGLE_BRANCH}</strong></div>
                <div><span className="text-slate-400 block">Customer Name</span><strong className="text-slate-900">{viewingRecord.customerName}</strong></div>
                <div><span className="text-slate-400 block">Takeover Bank</span><strong className="text-slate-900">{viewingRecord.takeoverBank || '—'}</strong></div>
                <div><span className="text-slate-400 block">Amount</span><strong className="text-slate-900">₹ {Number(viewingRecord.amount).toLocaleString('en-IN')}</strong></div>
                <div><span className="text-slate-400 block">Type</span><strong className="text-slate-900">{viewingRecord.type}</strong></div>
                <div><span className="text-slate-400 block">Status</span><strong className="text-slate-900">{viewingRecord.status}</strong></div>
                <div><span className="text-slate-400 block">PDD Date</span><strong className="text-slate-900">{viewingRecord.pddDate || '—'}</strong></div>
                <div><span className="text-slate-400 block">Bank Person</span><strong className="text-slate-900">{viewingRecord.bankPersonName || '—'}</strong></div>
                <div><span className="text-slate-400 block">R&P Person</span><strong className="text-slate-900">{viewingRecord.rpPerson || '—'}</strong></div>
              </div>

              {/* Legal Report Attachment Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Legal Report Attachment</span>
                  </span>
                  {viewingRecord.legalReportUrl ? (() => {
                    const format = getLegalReportFormat(viewingRecord.legalReportName, viewingRecord.legalReportFileType);
                    const isWord = format === 'doc' || format === 'docx';
                    return (
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] flex items-center gap-1 ${
                        isWord ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        <FileCheck className={`w-3 h-3 ${isWord ? 'text-blue-600' : 'text-rose-600'}`} />
                        <span>Attached ({format.toUpperCase()})</span>
                      </span>
                    );
                  })() : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded font-semibold text-[10px]">
                      Not Attached
                    </span>
                  )}
                </div>

                {viewingRecord.legalReportUrl ? (() => {
                  const format = getLegalReportFormat(viewingRecord.legalReportName, viewingRecord.legalReportFileType);
                  const isWord = format === 'doc' || format === 'docx';
                  return (
                    <div className={`p-3 bg-white rounded-xl border space-y-3 ${isWord ? 'border-blue-200' : 'border-rose-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isWord ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 bg-slate-100 border text-[9px] font-bold uppercase rounded ${
                              isWord ? 'text-blue-700 border-blue-200' : 'text-rose-700 border-rose-200'
                            }`}>
                              {format.toUpperCase()}
                            </span>
                            <p className="font-bold text-slate-900 text-xs truncate max-w-xs" title={viewingRecord.legalReportName || `Legal_Report.${format}`}>
                              {viewingRecord.legalReportName || `Legal_Report.${format}`}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatFileSize(viewingRecord.legalReportSize)} {viewingRecord.legalReportUploadedAt ? `· Uploaded ${viewingRecord.legalReportUploadedAt.slice(0, 10)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewDocumentRecord(viewingRecord)}
                          className={`flex-1 py-2 px-3 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors ${
                            isWord ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View {isWord ? `Word Document (${format.toUpperCase()})` : 'Legal Report (PDF)'}</span>
                        </button>
                        <a
                          href={viewingRecord.legalReportUrl}
                          download={viewingRecord.legalReportName || `Legal_Report_${viewingRecord.accountNumber}.${format}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-1">
                    <p>No Legal Report document (PDF or Word) is attached to this record.</p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const r = viewingRecord;
                          setViewingRecord(null);
                          openEditModal(r);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 text-[11px] cursor-pointer pt-1"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Attach Legal Report (Edit)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => shareToWhatsApp(viewingRecord)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEGAL REPORT DOCUMENT VIEWER MODAL (PDF & WORD) */}
      {previewDocumentRecord && (() => {
        const format = getLegalReportFormat(previewDocumentRecord.legalReportName, previewDocumentRecord.legalReportFileType);
        const isWord = format === 'doc' || format === 'docx';
        const docTitle = previewDocumentRecord.legalReportName || `Legal_Report_${previewDocumentRecord.accountNumber}.${format}`;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-slate-900 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-slate-800">
              {/* Header */}
              <div className="px-5 py-3.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isWord 
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                      : 'bg-rose-600/20 border-rose-500/40 text-rose-400'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold truncate">
                        Legal Report: {previewDocumentRecord.accountNumber} - {previewDocumentRecord.customerName}
                      </h3>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                        isWord ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {format.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {docTitle} {previewDocumentRecord.legalReportSize ? `· ${formatFileSize(previewDocumentRecord.legalReportSize)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {previewDocumentRecord.legalReportUrl && (
                    <>
                      <a
                        href={previewDocumentRecord.legalReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                        title="Open direct file URL in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Tab</span>
                      </a>
                      <a
                        href={previewDocumentRecord.legalReportUrl}
                        download={docTitle}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow-sm transition-colors ${
                          isWord ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                        title={`Download ${format.toUpperCase()} document`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewDocumentRecord(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Close Preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Frame / Viewer Area */}
              <div className="flex-1 bg-slate-800 relative flex flex-col min-h-0">
                {previewDocumentRecord.legalReportUrl ? (
                  isWord ? (
                    /* Word Document: Embedded Microsoft Office Online Viewer with fallback bar */
                    <div className="w-full h-full flex flex-col min-h-0">
                      <div className="px-4 py-2 bg-blue-950/80 border-b border-blue-900 text-blue-200 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>
                            Viewing <strong>.{format.toUpperCase()}</strong> via Microsoft Office Online Viewer.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={previewDocumentRecord.legalReportUrl}
                            download={docTitle}
                            className="text-xs font-semibold underline text-blue-300 hover:text-white flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Download original Word file
                          </a>
                        </div>
                      </div>
                      <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDocumentRecord.legalReportUrl)}`}
                        className="w-full flex-1 border-0 bg-white"
                        title={`Word Document Preview - ${previewDocumentRecord.accountNumber}`}
                      />
                    </div>
                  ) : (
                    /* PDF Document: Native Browser Frame */
                    <iframe
                      src={previewDocumentRecord.legalReportUrl}
                      className="w-full h-full flex-1 border-0 bg-white"
                      title={`Legal Report Preview - ${previewDocumentRecord.accountNumber}`}
                    />
                  )
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
                    <p>Document URL is unavailable.</p>
                  </div>
                )}
              </div>

              {/* Footer Bar */}
              <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2 shrink-0">
                <span>
                  Branch: <strong className="text-slate-300">{SINGLE_BRANCH}</strong> · Serial: <strong className="text-slate-300">{previewDocumentRecord.serialNumber}</strong> · Type: <strong className={isWord ? 'text-blue-400' : 'text-rose-400'}>{format.toUpperCase()}</strong>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Need direct file?</span>
                  <a
                    href={previewDocumentRecord.legalReportUrl || '#'}
                    download={docTitle}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hover:underline font-semibold ${isWord ? 'text-blue-400' : 'text-rose-400'}`}
                  >
                    Direct Download Link
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>SS INNOVATIVES MIS Management System © 2026 · Professional Corporate Edition</p>
      </footer>
    </div>
  );
}
