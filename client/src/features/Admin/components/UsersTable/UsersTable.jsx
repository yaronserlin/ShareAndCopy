/**
 * Preview: client/src/features/Admin/components/UsersTable/UsersTable.jsx
 * Description: Frontend application module.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../../../context/ThemeContext';
import styles from './UsersTable.module.css';
import { formatBytes } from '../../../../utils/format';


const UsersTable = ({ users }) => {
    const { theme } = useTheme();

    return (
        <div className="row">
            <div className="col-12">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h4 className={`fw-bold ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>
                        <i className="bi bi-trophy-fill text-warning me-2"></i>
                        Top Users by Activity
                    </h4>
                </div>

                <div className={`table-responsive ${styles.tableGlass}`}>
                    <table className="table mb-0 align-middle">
                        <thead>
                            <tr>
                                <th scope="col" className="py-3 px-4 d-none d-md-table-cell">#</th>
                                <th scope="col" className="py-3 px-4">User</th>
                                <th scope="col" className="py-3 px-4 d-none d-lg-table-cell">Email</th>
                                <th scope="col" className="py-3 px-4 text-center">Uploads</th>
                                <th scope="col" className="py-3 px-4 text-end">Data Transferred</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users && users.length > 0 ? (
                                users.map((user, index) => (
                                    <tr
                                        key={user._id}
                                        className={styles.cursorDefault}
                                    >
                                        <td className="px-4 fw-bold text-secondary d-none d-md-table-cell">{index + 1}</td>
                                        <td className="px-4">
                                            <div className="d-flex align-items-center">
                                                <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${theme === 'dark' ? 'bg-secondary bg-opacity-25' : 'bg-light border'}`} style={{ width: '32px', height: '32px' }}>
                                                    {user.firstName.charAt(0)}
                                                </div>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-medium">{user.firstName} {user.lastName}</span>
                                                    <span className="small text-muted d-lg-none">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 text-muted d-none d-lg-table-cell">{user.email}</td>
                                        <td className="px-4 text-center">
                                            <span className={`badge ${theme === 'dark' ? 'bg-secondary bg-opacity-25 text-secondary-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'} fs-6`}>
                                                {user.uploadCount || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 text-end fw-bold text-success">
                                            {formatBytes(user.dataTransferred || 0)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-5 text-muted">No user data available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

UsersTable.propTypes = {
    users: PropTypes.arrayOf(PropTypes.shape({
        _id: PropTypes.string.isRequired,
        firstName: PropTypes.string.isRequired,
        lastName: PropTypes.string,
        email: PropTypes.string,
        dataTransferred: PropTypes.number,
        uploadCount: PropTypes.number,
    })),
};

export default UsersTable;
