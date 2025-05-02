// Add this route configuration
{
    path: '/create-order',
    element: (
        <AuthGuard>
            <CreateOrderForm />
        </AuthGuard>
    )
}