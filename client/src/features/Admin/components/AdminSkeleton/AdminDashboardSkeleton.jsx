/**
 * Preview: client/src/features/Admin/components/AdminSkeleton/AdminDashboardSkeleton.jsx
 * Description: Frontend application module.
 */

import React from 'react';
import Skeleton from '../../../../components/common/Skeleton';
import BackgroundDecorations from '../../../../components/common/BackgroundDecorations';


const AdminDashboardSkeleton = () => {
    return (
        <div className="container mt-4 pt-5" style={{ position: 'relative', zIndex: 0, paddingBottom: '5rem', minHeight: '100vh' }}>
            <BackgroundDecorations />

            {}
            <div className="mb-5 mt-4">
                <Skeleton width="40%" height="48px" className="mb-2 rounded-3" />
                <Skeleton width="25%" height="20px" className="rounded-3 opacity-50" />
            </div>

            {}
            <div className="row g-4 mb-5">
                {[1, 2, 3].map(i => (
                    <div key={i} className="col-md-4">
                        <div className="rounded-4 p-4 h-100 border-0" style={{ minHeight: '160px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                            <div className="d-flex justify-content-between mb-3">
                                <Skeleton width="40%" height="20px" />
                                <Skeleton width="40px" height="40px" variant="circle" />
                            </div>
                            <Skeleton width="60%" height="40px" className="mt-2" />
                        </div>
                    </div>
                ))}
            </div>

            {}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <div className="p-4 border-bottom border-white border-opacity-10 d-flex justify-content-between align-items-center">
                    <Skeleton width="200px" height="28px" />
                </div>
                <div className="table-responsive">
                    <table className="table mb-0">
                        <thead>
                            <tr>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <th key={i} className="py-3 px-4">
                                        <Skeleton width="100%" height="20px" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5].map(row => (
                                <tr key={row}>
                                    {[1, 2, 3, 4, 5, 6].map(col => (
                                        <td key={col} className="py-3 px-4">
                                            <Skeleton width="90%" height="20px" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardSkeleton;
