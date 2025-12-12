import React from 'react';
import Skeleton from '../../../components/common/Skeleton';
import GlassCard from '../../../components/common/GlassCard';

const RoomSkeleton = () => {
    return (
        <div className="flex-grow-1 p-4 pb-5 position-relative overflow-hidden">

            {/* Header Skeleton */}
            <div className="container position-relative z-1 room-container">
                <div className="room-header-wrapper">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div>
                            <Skeleton width="300px" height="40px" />
                        </div>
                        <div className="d-flex gap-3">
                            <Skeleton width="120px" height="50px" />
                            <Skeleton width="50px" height="50px" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <Skeleton width="100%" height="8px" />
                    </div>
                </div>

                {/* Toolbar Skeleton */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <Skeleton width="150px" height="30px" />
                    <Skeleton width="140px" height="40px" variant="rect" style={{ borderRadius: '50px' }} />
                </div>

                {/* File List Grid Skeleton */}
                <div className="row g-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="col-12 col-md-6 col-lg-4">
                            <GlassCard className="h-100">
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <Skeleton width="48px" height="48px" variant="circle" />
                                    <div className="flex-grow-1">
                                        <Skeleton width="70%" height="20px" className="mb-2" />
                                        <Skeleton width="40%" height="16px" />
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between mt-3">
                                    <Skeleton width="30%" height="30px" />
                                    <Skeleton width="30%" height="30px" />
                                </div>
                            </GlassCard>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RoomSkeleton;
