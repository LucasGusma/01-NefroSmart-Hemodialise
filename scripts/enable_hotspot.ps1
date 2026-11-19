try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    })[0]
    
    [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType=WindowsRuntime] | Out-Null
    [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType=WindowsRuntime] | Out-Null
    
    $profile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
    if ($profile) {
        $manager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($profile)
        if ($manager.TetheringOperationalState -ne 1) {
            $op = $manager.StartTetheringAsync()
            $m = $asTaskGeneric.MakeGenericMethod([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult])
            $task = $m.Invoke($null, @($op))
            $task.Wait(8000)
        }
    }
} catch {
    # Ignora se não houver interface de hotspot disponível
}
